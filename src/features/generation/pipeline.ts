import { db } from "@/lib/db";
import { auditResults, sites, siteVersions, tenants } from "@/db/schema";
import { eq } from "drizzle-orm";
import { generateText } from "ai";
import { models } from "@/lib/ai";
import { buildGenerationPrompt, parseGeneratedFiles } from "./prompts";
import { storeSiteFiles } from "./storage";
import { createSiteProject } from "./deploy";
import {
  DESIGN_DIRECTIVES,
  type BusinessContext,
  type DesignDirective,
} from "./types";
import type { AuditPipelineResult } from "@/features/audit/types";

/**
 * Run the full generation pipeline: generate 3 site versions from audit data.
 *
 * 1. Look up AuditResult from DB
 * 2. Create Site record + 3 SiteVersion records (status: "generating")
 * 3. Run 3 AI generations in parallel
 * 4. For each: store code in Blob, update SiteVersion, emit progress
 */
export async function runGenerationPipeline(
  generationId: string,
  auditResultId: string,
  businessContext: BusinessContext
): Promise<void> {
  try {
    // 1. Look up AuditResult
    const [auditResult] = await db
      .select()
      .from(auditResults)
      .where(eq(auditResults.id, auditResultId))
      .limit(1);

    if (!auditResult) {
      console.error(`AuditResult ${auditResultId} not found`);
      return;
    }

    // Build the pipeline result from DB fields
    const auditData: AuditPipelineResult = {
      seoScore: auditResult.seoScore,
      mobileScore: auditResult.mobileScore,
      ctaAnalysis: auditResult.ctaAnalysis as AuditPipelineResult["ctaAnalysis"],
      metaTags: auditResult.metaTags,
      analyticsDetected: auditResult.analyticsDetected,
      dnsInfo: auditResult.dnsInfo,
      screenshotDesktop: auditResult.screenshotDesktop,
      screenshotMobile: auditResult.screenshotMobile,
    };

    // 2. Find or create Tenant, create Site + 3 SiteVersions
    let tenantId = auditResult.tenantId;
    if (!tenantId) {
      // Create a tenant from business context
      const [tenant] = await db
        .insert(tenants)
        .values({
          businessName: businessContext.businessName,
          contactEmail: businessContext.contactEmail,
          phone: businessContext.phone,
          industry: businessContext.industry,
          services: businessContext.services,
          locations: businessContext.locations,
          targetKeywords: businessContext.targetKeywords,
        })
        .returning();
      tenantId = tenant.id;

      // Link audit result to tenant
      await db
        .update(auditResults)
        .set({ tenantId })
        .where(eq(auditResults.id, auditResultId));
    }

    // Create Vercel project
    const vercelProjectId = await createSiteProject(
      tenantId,
      businessContext.businessName
    );

    // Create Site record
    const [site] = await db
      .insert(sites)
      .values({
        tenantId,
        vercelProjectId,
        generationId,
        previewDomain: `preview-${tenantId.slice(0, 8)}.vercel.app`,
        status: "demo",
      })
      .returning();

    // Create 3 SiteVersion records
    const versionRecords = await Promise.all(
      DESIGN_DIRECTIVES.map((directive) =>
        db
          .insert(siteVersions)
          .values({
            siteId: site.id,
            versionNumber: directive.versionNumber,
            generatedCodeRef: "", // placeholder until generation completes
            previewUrl: "", // placeholder
            designMeta: {
              colorPalette: directive.colorPalette,
              layoutType: directive.layoutType,
              typography: directive.typography,
            },
            status: "generating",
          })
          .returning()
          .then((rows) => rows[0])
      )
    );

    // 3. Run 3 AI generations in parallel
    const generationPromises = DESIGN_DIRECTIVES.map(
      (directive, index) =>
        generateSingleVersion(
          site.id,
          versionRecords[index].id,
          directive,
          businessContext,
          auditData
        )
    );

    const results = await Promise.allSettled(generationPromises);

    // Check results
    const successCount = results.filter(
      (r) => r.status === "fulfilled" && r.value === true
    ).length;

    if (successCount === 0) {
      console.error(`Generation ${generationId}: all 3 versions failed`);
      return;
    }

    console.log(`Generation ${generationId}: ${successCount}/3 versions ready`);
  } catch (err) {
    console.error(`Generation pipeline ${generationId} failed:`, err);
  }
}

/**
 * Generate a single site version.
 * Returns true on success, false on failure.
 */
async function generateSingleVersion(
  siteId: string,
  siteVersionId: string,
  directive: DesignDirective,
  businessContext: BusinessContext,
  auditData: AuditPipelineResult | null
): Promise<boolean> {
  const vNum = directive.versionNumber;

  try {
    // Build prompt and call AI
    const prompt = buildGenerationPrompt(directive, businessContext, auditData);

    const { text } = await generateText({
      model: models.generation,
      prompt,
      maxOutputTokens: 16000,
    });

    // Parse the generated files
    const files = parseGeneratedFiles(text);
    if (!files) {
      throw new Error("Failed to parse AI response into valid file map");
    }

    // Validate required files exist
    const requiredFiles = ["app/page.tsx", "app/layout.tsx", "package.json"];
    const missingFiles = requiredFiles.filter((f) => !files[f]);
    if (missingFiles.length > 0) {
      throw new Error(`Missing required files: ${missingFiles.join(", ")}`);
    }

    // Store in Blob Storage
    const blobUrl = await storeSiteFiles(siteId, vNum, files);

    // Update SiteVersion record
    const previewUrl = `https://preview-${siteId.slice(0, 8)}-v${vNum}.vercel.app`;
    await db
      .update(siteVersions)
      .set({
        generatedCodeRef: blobUrl,
        previewUrl,
        status: "ready",
      })
      .where(eq(siteVersions.id, siteVersionId));

    return true;
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";

    // Mark version as failed in DB
    await db
      .update(siteVersions)
      .set({ status: "failed" })
      .where(eq(siteVersions.id, siteVersionId));

    console.error(`Version ${vNum} failed:`, errorMessage);
    return false;
  }
}
