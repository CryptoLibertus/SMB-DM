import { generateText } from "ai";
import { models } from "@/lib/ai";
import { db } from "@/lib/db";
import { changeRequests, sites } from "@/db/schema";
import { eq } from "drizzle-orm";
import { deploySiteVersion } from "@/features/generation/deploy";
import {
  checkRequestLimit,
  getMonthlyRequestCount,
  MAX_REVISIONS,
} from "./change-limits";
import type { ChangeRequestSource } from "@/types/enums";

/**
 * Create a new change request, checking monthly limits.
 */
export async function createChangeRequest(
  siteId: string,
  source: ChangeRequestSource,
  description: string,
  attachments: string[] = []
): Promise<{ id: string; monthlyRequestNumber: number }> {
  const limit = await checkRequestLimit(siteId);

  if (!limit.allowed) {
    throw new Error(
      `Monthly change request limit reached (${limit.count}/${limit.limit}). ` +
        "Need more updates? Upgrade to our Pro plan."
    );
  }

  const monthlyRequestNumber = limit.count + 1;

  const [request] = await db
    .insert(changeRequests)
    .values({
      siteId,
      source,
      requestType: "other", // Will be classified by AI interpretation
      description,
      attachments,
      status: "received",
      monthlyRequestNumber,
    })
    .returning();

  // Start AI interpretation asynchronously (non-blocking)
  interpretChangeRequest(request.id).catch((err) => {
    console.error(`Failed to interpret change request ${request.id}:`, err);
  });

  return { id: request.id, monthlyRequestNumber };
}

/**
 * Use AI to classify the request type and draft changes.
 */
export async function interpretChangeRequest(
  changeRequestId: string
): Promise<void> {
  const [request] = await db
    .select()
    .from(changeRequests)
    .where(eq(changeRequests.id, changeRequestId))
    .limit(1);

  if (!request) throw new Error(`ChangeRequest ${changeRequestId} not found`);

  await db
    .update(changeRequests)
    .set({ status: "processing", updatedAt: new Date() })
    .where(eq(changeRequests.id, changeRequestId));

  try {
    const { text } = await generateText({
      model: models.changeInterpretation,
      system:
        "You are a website change request interpreter. Analyze the request and classify it. " +
        "Return ONLY valid JSON with keys: " +
        'requestType (one of: "copy_edit", "image_swap", "new_page", "contact_update", "other"), ' +
        "summary (brief description of what to change), " +
        "isAmbiguous (boolean - true if the request is unclear), " +
        "isOutOfScope (boolean - true if the request cannot be fulfilled by simple web changes), " +
        "clarificationNeeded (string or null - question to ask if ambiguous).",
      prompt: `Classify this website change request:

"${request.description}"

Attachments: ${request.attachments.length > 0 ? request.attachments.join(", ") : "none"}

Valid request types:
- copy_edit: Text changes on existing pages
- image_swap: Replace images on the site
- new_page: Create a new page (service page, location page, etc.)
- contact_update: Update contact info (phone, email, address, hours)
- other: Anything that doesn't fit above

Return ONLY valid JSON.`,
    });

    const parsed = JSON.parse(text.trim());

    const requestType = [
      "copy_edit",
      "image_swap",
      "new_page",
      "contact_update",
      "other",
    ].includes(parsed.requestType)
      ? (parsed.requestType as typeof request.requestType)
      : "other";

    await db
      .update(changeRequests)
      .set({
        requestType,
        updatedAt: new Date(),
      })
      .where(eq(changeRequests.id, changeRequestId));

    // If not ambiguous and not out-of-scope, generate preview
    if (!parsed.isAmbiguous && !parsed.isOutOfScope) {
      await generateChangePreview(changeRequestId);
    }
  } catch (err) {
    console.error(`AI interpretation failed for ${changeRequestId}:`, err);
    // Keep in processing state; can be manually retried
  }
}

/**
 * Generate a preview of the requested changes, set previewUrl with 14-day expiry.
 */
export async function generateChangePreview(
  changeRequestId: string
): Promise<void> {
  const [request] = await db
    .select()
    .from(changeRequests)
    .where(eq(changeRequests.id, changeRequestId))
    .limit(1);

  if (!request) throw new Error(`ChangeRequest ${changeRequestId} not found`);

  const [site] = await db
    .select()
    .from(sites)
    .where(eq(sites.id, request.siteId))
    .limit(1);

  if (!site) throw new Error(`Site ${request.siteId} not found`);

  // Generate a preview URL (in production this would deploy a preview version)
  const previewUrl = `https://${site.previewDomain}/preview/change/${changeRequestId}`;
  const previewExpiresAt = new Date();
  previewExpiresAt.setDate(previewExpiresAt.getDate() + 14);

  await db
    .update(changeRequests)
    .set({
      status: "preview_ready",
      previewUrl,
      previewExpiresAt,
      updatedAt: new Date(),
    })
    .where(eq(changeRequests.id, changeRequestId));
}

/**
 * Approve a change request and deploy it to the live site.
 */
export async function approveChange(changeRequestId: string): Promise<void> {
  const [request] = await db
    .select()
    .from(changeRequests)
    .where(eq(changeRequests.id, changeRequestId))
    .limit(1);

  if (!request) throw new Error(`ChangeRequest ${changeRequestId} not found`);
  if (request.status !== "preview_ready") {
    throw new Error(
      `ChangeRequest ${changeRequestId} is not ready for approval (status: ${request.status})`
    );
  }

  await db
    .update(changeRequests)
    .set({ status: "approved", updatedAt: new Date() })
    .where(eq(changeRequests.id, changeRequestId));

  // Deploy the changes
  const [site] = await db
    .select()
    .from(sites)
    .where(eq(sites.id, request.siteId))
    .limit(1);

  if (!site) throw new Error(`Site ${request.siteId} not found`);
  if (!site.selectedVersionId) {
    throw new Error(`Site ${request.siteId} has no selected version`);
  }

  try {
    await deploySiteVersion(request.siteId, site.selectedVersionId, "change");

    await db
      .update(changeRequests)
      .set({ status: "deployed", updatedAt: new Date() })
      .where(eq(changeRequests.id, changeRequestId));
  } catch (err) {
    // Revert status on deploy failure
    await db
      .update(changeRequests)
      .set({ status: "preview_ready", updatedAt: new Date() })
      .where(eq(changeRequests.id, changeRequestId));
    throw err;
  }
}

/**
 * Request a revision on a change request (max 3 revisions).
 */
export async function requestRevision(
  changeRequestId: string,
  feedback: string
): Promise<void> {
  const [request] = await db
    .select()
    .from(changeRequests)
    .where(eq(changeRequests.id, changeRequestId))
    .limit(1);

  if (!request) throw new Error(`ChangeRequest ${changeRequestId} not found`);

  if (request.revisionCount >= MAX_REVISIONS) {
    throw new Error(
      `Maximum revision limit reached (${MAX_REVISIONS}). Please create a new change request.`
    );
  }

  await db
    .update(changeRequests)
    .set({
      revisionCount: request.revisionCount + 1,
      description: `${request.description}\n\n--- Revision feedback ---\n${feedback}`,
      status: "processing",
      updatedAt: new Date(),
    })
    .where(eq(changeRequests.id, changeRequestId));

  // Re-run interpretation with the updated description (includes feedback)
  await interpretChangeRequest(changeRequestId);
}
