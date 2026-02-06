/**
 * Email report templates sent via Resend.
 * Clean, simple HTML emails with inline styles for weekly and monthly summaries.
 */

import { resend } from "@/lib/email";
import { db } from "@/lib/db";
import { emailReports } from "@/db/schema";
import { eq } from "drizzle-orm";
import type { ReportContent, ReportRecord } from "./reports";

// ── Types ───────────────────────────────────────────────────────────────────────

interface TenantInfo {
  id: string;
  businessName: string;
  contactEmail: string;
}

// ── Email HTML builders ─────────────────────────────────────────────────────────

function formatDateRange(start: Date, end: Date): string {
  const opts: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    year: "numeric",
  };
  return `${start.toLocaleDateString("en-US", opts)} - ${end.toLocaleDateString("en-US", opts)}`;
}

function buildLeadsSection(leads: ReportContent["leads"]): string {
  const rows = Object.entries(leads.byType)
    .filter(([, count]) => count > 0)
    .map(
      ([type, count]) =>
        `<tr>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;text-transform:capitalize;">${type.replace("_", " ")}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;font-weight:600;">${count}</td>
        </tr>`
    )
    .join("");

  if (!rows) {
    return `<p style="color:#666;font-size:14px;">No leads recorded this period.</p>`;
  }

  return `
    <table style="width:100%;border-collapse:collapse;margin:12px 0;">
      <thead>
        <tr>
          <th style="padding:8px 12px;text-align:left;border-bottom:2px solid #ddd;font-size:13px;color:#666;">Lead Type</th>
          <th style="padding:8px 12px;text-align:right;border-bottom:2px solid #ddd;font-size:13px;color:#666;">Count</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
      <tfoot>
        <tr>
          <td style="padding:8px 12px;font-weight:700;">Total</td>
          <td style="padding:8px 12px;text-align:right;font-weight:700;">${leads.total}</td>
        </tr>
      </tfoot>
    </table>`;
}

function buildNotableChangesSection(changes: string[]): string {
  if (changes.length === 0) return "";

  const items = changes.map((c) => `<li style="margin:4px 0;">${c}</li>`).join("");
  return `
    <div style="margin-top:24px;">
      <h3 style="font-size:16px;color:#333;margin-bottom:8px;">Notable Changes</h3>
      <ul style="padding-left:20px;color:#555;font-size:14px;">${items}</ul>
    </div>`;
}

function buildReportHtml(
  tenant: TenantInfo,
  report: ReportRecord,
  periodLabel: string
): string {
  const content = report.content;
  const dateRange = formatDateRange(report.periodStart, report.periodEnd);

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:20px;">
    <div style="background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
      <!-- Header -->
      <div style="background:#1a1a2e;padding:24px 32px;">
        <h1 style="color:#fff;font-size:20px;margin:0;">${periodLabel} Report</h1>
        <p style="color:#a0a0b0;font-size:14px;margin:8px 0 0;">${tenant.businessName} &mdash; ${dateRange}</p>
      </div>

      <!-- Content -->
      <div style="padding:32px;">
        <!-- Traffic -->
        <h2 style="font-size:18px;color:#333;margin:0 0 16px;">Traffic</h2>
        <div style="display:flex;gap:24px;margin-bottom:24px;">
          <div style="flex:1;background:#f8f9fa;border-radius:6px;padding:16px;text-align:center;">
            <div style="font-size:28px;font-weight:700;color:#1a1a2e;">${content.traffic.visits.toLocaleString()}</div>
            <div style="font-size:13px;color:#666;margin-top:4px;">Total Visits</div>
          </div>
          <div style="flex:1;background:#f8f9fa;border-radius:6px;padding:16px;text-align:center;">
            <div style="font-size:28px;font-weight:700;color:#1a1a2e;">${content.traffic.uniqueVisitors.toLocaleString()}</div>
            <div style="font-size:13px;color:#666;margin-top:4px;">Unique Visitors</div>
          </div>
        </div>

        <!-- Leads -->
        <h2 style="font-size:18px;color:#333;margin:0 0 12px;">Leads</h2>
        ${buildLeadsSection(content.leads)}

        <!-- Blog Posts -->
        <div style="margin-top:24px;">
          <h3 style="font-size:16px;color:#333;margin-bottom:8px;">Content</h3>
          <p style="color:#555;font-size:14px;margin:0;">
            <strong>${content.blogPostsPublished}</strong> blog post${content.blogPostsPublished !== 1 ? "s" : ""} published this period.
          </p>
        </div>

        <!-- Notable Changes -->
        ${buildNotableChangesSection(content.notableChanges)}
      </div>

      <!-- Footer -->
      <div style="background:#f8f9fa;padding:16px 32px;border-top:1px solid #eee;">
        <p style="color:#999;font-size:12px;margin:0;text-align:center;">
          This report was automatically generated for ${tenant.businessName}.
          Log in to your dashboard for more details.
        </p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

// ── Send functions ──────────────────────────────────────────────────────────────

const FROM_ADDRESS = process.env.REPORT_FROM_EMAIL || "reports@updates.smbdm.com";

async function markReportSent(reportId: string): Promise<void> {
  await db
    .update(emailReports)
    .set({ sentAt: new Date() })
    .where(eq(emailReports.id, reportId));
}

/**
 * Send a weekly report email to the tenant.
 */
export async function sendWeeklyReport(
  tenant: TenantInfo,
  report: ReportRecord
): Promise<void> {
  const html = buildReportHtml(tenant, report, "Weekly");

  await resend.emails.send({
    from: FROM_ADDRESS,
    to: tenant.contactEmail,
    subject: `Weekly Report - ${tenant.businessName}`,
    html,
  });

  await markReportSent(report.id);
}

/**
 * Send a monthly report email to the tenant.
 */
export async function sendMonthlyReport(
  tenant: TenantInfo,
  report: ReportRecord
): Promise<void> {
  const html = buildReportHtml(tenant, report, "Monthly");

  await resend.emails.send({
    from: FROM_ADDRESS,
    to: tenant.contactEmail,
    subject: `Monthly Report - ${tenant.businessName}`,
    html,
  });

  await markReportSent(report.id);
}
