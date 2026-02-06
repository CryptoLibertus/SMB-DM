import { db } from "@/lib/db";
import { tenants, sites } from "@/db/schema";
import { eq } from "drizzle-orm";
import { resend } from "@/lib/email";
import { createChangeRequest } from "./change-request";

interface ParsedEmail {
  from: string;
  subject: string;
  text: string;
  html: string;
  attachments: string[];
}

/**
 * Parse a SendGrid Inbound Parse payload from FormData.
 */
export function parseSendGridPayload(formData: FormData): ParsedEmail {
  const from = (formData.get("from") as string) ?? "";
  const subject = (formData.get("subject") as string) ?? "";
  const text = (formData.get("text") as string) ?? "";
  const html = (formData.get("html") as string) ?? "";

  // Extract attachments (SendGrid sends attachment info as JSON)
  const attachments: string[] = [];
  const attachmentInfo = formData.get("attachment-info");
  if (attachmentInfo) {
    try {
      const info = JSON.parse(attachmentInfo as string);
      for (const key of Object.keys(info)) {
        const file = formData.get(key);
        if (file) {
          // In production, upload to blob storage and store the URL
          attachments.push(info[key].filename ?? key);
        }
      }
    } catch {
      // Ignore malformed attachment info
    }
  }

  return { from, subject, text, html, attachments };
}

/**
 * Extract email address from a "Name <email>" formatted string.
 */
function extractEmail(from: string): string {
  const match = from.match(/<([^>]+)>/);
  return (match ? match[1] : from).toLowerCase().trim();
}

/**
 * Process an inbound email: verify sender, create change request(s).
 */
export async function processInboundEmail(
  formData: FormData
): Promise<{ status: string; changeRequestIds: string[] }> {
  const email = parseSendGridPayload(formData);
  const senderEmail = extractEmail(email.from);

  // Find the tenant by contact email
  const [tenant] = await db
    .select()
    .from(tenants)
    .where(eq(tenants.contactEmail, senderEmail))
    .limit(1);

  if (!tenant) {
    // Unknown sender - try to find any tenant and put in verification hold
    // For now, return that we couldn't match the sender
    return { status: "unknown_sender", changeRequestIds: [] };
  }

  // Get the tenant's site
  const [site] = await db
    .select()
    .from(sites)
    .where(eq(sites.tenantId, tenant.id))
    .limit(1);

  if (!site) {
    return { status: "no_site", changeRequestIds: [] };
  }

  // Combine subject and body for the change request description
  const description = `Subject: ${email.subject}\n\n${email.text || email.html}`;

  // Check if this looks like it might contain multiple requests
  const requests = splitMultipleRequests(description);
  const changeRequestIds: string[] = [];

  for (const requestDescription of requests) {
    try {
      const result = await createChangeRequest(
        site.id,
        "email",
        requestDescription,
        email.attachments
      );
      changeRequestIds.push(result.id);
    } catch (err) {
      // If limit is reached, notify via email
      if (err instanceof Error && err.message.includes("limit reached")) {
        await sendLimitReachedEmail(tenant.contactEmail, tenant.businessName);
        return { status: "limit_reached", changeRequestIds };
      }
      throw err;
    }
  }

  return { status: "processed", changeRequestIds };
}

/**
 * Attempt to split a multi-request email into separate requests.
 * Looks for numbered lists or clear separators.
 */
function splitMultipleRequests(description: string): string[] {
  // Check for numbered list pattern (1. ..., 2. ..., etc.)
  const numberedPattern = /^\s*\d+[\.\)]\s+/m;
  if (numberedPattern.test(description)) {
    const items = description.split(/^\s*\d+[\.\)]\s+/m).filter((s) => s.trim());
    if (items.length > 1) {
      return items.map((item) => item.trim());
    }
  }

  // Check for separator patterns (----, ====, "Also,", "Additionally,")
  const separatorPattern = /\n\s*(?:---+|====+|Also[,:]|Additionally[,:])\s*\n/i;
  if (separatorPattern.test(description)) {
    const parts = description
      .split(separatorPattern)
      .filter((s) => s.trim().length > 20);
    if (parts.length > 1) {
      return parts.map((part) => part.trim());
    }
  }

  // Single request
  return [description];
}

/**
 * Send a verification email when an unrecognized sender makes a request.
 */
export async function sendVerificationEmail(
  tenantEmail: string,
  originalSender: string,
  tenantBusinessName: string
): Promise<void> {
  await resend.emails.send({
    from: "updates@platform.com",
    to: tenantEmail,
    subject: `Verify change request for ${tenantBusinessName}`,
    html: `
      <h2>Did you send this request?</h2>
      <p>We received a website change request from <strong>${originalSender}</strong>
      for your business <strong>${tenantBusinessName}</strong>.</p>
      <p>If you authorized this request, please log into your dashboard to review and approve it.</p>
      <p>If you did not send this request, you can safely ignore this email.</p>
    `,
  });
}

/**
 * Send a clarification email when the AI can't determine the request.
 */
export async function sendClarificationEmail(
  tenantEmail: string,
  question: string
): Promise<void> {
  await resend.emails.send({
    from: "updates@platform.com",
    to: tenantEmail,
    subject: "We need a little more info about your change request",
    html: `
      <h2>Quick clarification needed</h2>
      <p>We received your change request but need a bit more detail to get it right:</p>
      <p><em>${question}</em></p>
      <p>Just reply to this email with the additional details and we'll get started right away.</p>
    `,
  });
}

/**
 * Send a polite boundary response for out-of-scope requests.
 */
export async function sendOutOfScopeEmail(
  tenantEmail: string,
  requestSummary: string
): Promise<void> {
  await resend.emails.send({
    from: "updates@platform.com",
    to: tenantEmail,
    subject: "About your recent change request",
    html: `
      <h2>About your request</h2>
      <p>We received your request: <em>"${requestSummary}"</em></p>
      <p>This type of change is outside what's included in your current plan.
      Your plan covers: copy edits, image swaps, new service/location pages, and contact info updates.</p>
      <p>For more advanced changes, please reach out to our support team and we'll be happy to discuss options.</p>
    `,
  });
}

async function sendLimitReachedEmail(
  email: string,
  businessName: string
): Promise<void> {
  await resend.emails.send({
    from: "updates@platform.com",
    to: email,
    subject: `Monthly update limit reached for ${businessName}`,
    html: `
      <h2>Monthly limit reached</h2>
      <p>You've used all 5 of your included monthly change requests for <strong>${businessName}</strong>.</p>
      <p>Need more updates? Upgrade to our Pro plan for additional requests.</p>
      <p>Your limit resets at the start of your next billing cycle.</p>
    `,
  });
}
