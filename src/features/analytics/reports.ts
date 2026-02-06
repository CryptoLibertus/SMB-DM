/**
 * Report generation for weekly and monthly analytics summaries.
 * Fetches PostHog data, compiles into a report, and stores in the EmailReport table.
 */

import { db } from "@/lib/db";
import { emailReports, blogPosts, sites } from "@/db/schema";
import { eq, and, gte, lte, count } from "drizzle-orm";
import { getAnalyticsData, type AnalyticsData } from "./dashboard";

// ── Types ───────────────────────────────────────────────────────────────────────

export interface ReportContent {
  traffic: { visits: number; uniqueVisitors: number };
  leads: { total: number; byType: Record<string, number> };
  blogPostsPublished: number;
  notableChanges: string[];
}

export interface ReportRecord {
  id: string;
  tenantId: string;
  reportType: "weekly" | "monthly";
  periodStart: Date;
  periodEnd: Date;
  content: ReportContent;
  sentAt: Date | null;
  createdAt: Date;
}

// ── Helpers ─────────────────────────────────────────────────────────────────────

function getDateNDaysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getFirstOfLastMonth(): Date {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getLastOfLastMonth(): Date {
  const d = new Date();
  d.setDate(0); // last day of previous month
  d.setHours(23, 59, 59, 999);
  return d;
}

function formatDate(d: Date): string {
  return d.toISOString().split("T")[0]!;
}

async function getBlogPostCount(
  tenantId: string,
  periodStart: Date,
  periodEnd: Date
): Promise<number> {
  const result = await db
    .select({ count: count() })
    .from(blogPosts)
    .innerJoin(sites, eq(blogPosts.siteId, sites.id))
    .where(
      and(
        eq(sites.tenantId, tenantId),
        eq(blogPosts.status, "published"),
        gte(blogPosts.publishedAt, periodStart),
        lte(blogPosts.publishedAt, periodEnd)
      )
    );

  return result[0]?.count ?? 0;
}

function detectNotableChanges(
  analytics: AnalyticsData,
  blogPostCount: number
): string[] {
  const changes: string[] = [];

  if (analytics.totalVisits > 100) {
    changes.push(
      `Strong traffic: ${analytics.totalVisits} visits this period`
    );
  }

  const totalLeads =
    analytics.leads.phone_click +
    analytics.leads.email_click +
    analytics.leads.form_submit;
  if (totalLeads > 0) {
    changes.push(`${totalLeads} new lead${totalLeads > 1 ? "s" : ""} generated`);
  }

  if (blogPostCount > 0) {
    changes.push(
      `${blogPostCount} blog post${blogPostCount > 1 ? "s" : ""} published`
    );
  }

  if (analytics.topPages.length > 0 && analytics.topPages[0]!.views > 20) {
    changes.push(
      `Top page: ${analytics.topPages[0]!.url} (${analytics.topPages[0]!.views} views)`
    );
  }

  return changes;
}

// ── Report generation ───────────────────────────────────────────────────────────

async function buildReportContent(
  tenantId: string,
  periodStart: Date,
  periodEnd: Date
): Promise<ReportContent> {
  const dateRange = {
    startDate: formatDate(periodStart),
    endDate: formatDate(periodEnd),
  };

  const analytics = await getAnalyticsData(tenantId, dateRange);
  const blogPostCount = await getBlogPostCount(tenantId, periodStart, periodEnd);

  const totalLeads =
    analytics.leads.phone_click +
    analytics.leads.email_click +
    analytics.leads.form_submit +
    analytics.leads.cta_click;

  return {
    traffic: {
      visits: analytics.totalVisits,
      uniqueVisitors: analytics.uniqueVisitors,
    },
    leads: {
      total: totalLeads,
      byType: { ...analytics.leads },
    },
    blogPostsPublished: blogPostCount,
    notableChanges: detectNotableChanges(analytics, blogPostCount),
  };
}

/**
 * Generate a weekly report for the last 7 days and store in the DB.
 */
export async function generateWeeklyReport(
  tenantId: string
): Promise<ReportRecord> {
  const periodEnd = new Date();
  periodEnd.setHours(23, 59, 59, 999);
  const periodStart = getDateNDaysAgo(7);

  const content = await buildReportContent(tenantId, periodStart, periodEnd);

  const [record] = await db
    .insert(emailReports)
    .values({
      tenantId,
      reportType: "weekly",
      periodStart,
      periodEnd,
      content,
    })
    .returning();

  return {
    id: record!.id,
    tenantId: record!.tenantId,
    reportType: record!.reportType,
    periodStart: record!.periodStart,
    periodEnd: record!.periodEnd,
    content: record!.content as ReportContent,
    sentAt: record!.sentAt,
    createdAt: record!.createdAt,
  };
}

/**
 * Generate a monthly report for the previous calendar month and store in the DB.
 */
export async function generateMonthlyReport(
  tenantId: string
): Promise<ReportRecord> {
  const periodStart = getFirstOfLastMonth();
  const periodEnd = getLastOfLastMonth();

  const content = await buildReportContent(tenantId, periodStart, periodEnd);

  const [record] = await db
    .insert(emailReports)
    .values({
      tenantId,
      reportType: "monthly",
      periodStart,
      periodEnd,
      content,
    })
    .returning();

  return {
    id: record!.id,
    tenantId: record!.tenantId,
    reportType: record!.reportType,
    periodStart: record!.periodStart,
    periodEnd: record!.periodEnd,
    content: record!.content as ReportContent,
    sentAt: record!.sentAt,
    createdAt: record!.createdAt,
  };
}

/**
 * Calculate the next report times based on the tenant's timezone.
 * Weekly: next Monday at 9:00 AM in tenant timezone.
 * Monthly: 1st of next month at 9:00 AM in tenant timezone.
 */
export function getReportSchedule(tenant: {
  timezone: string;
}): { nextWeekly: Date; nextMonthly: Date } {
  const tz = tenant.timezone;
  const now = new Date();

  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    weekday: "short",
    hour12: false,
  });
  const parts = formatter.formatToParts(now);
  const currentDay = parts.find((p) => p.type === "weekday")?.value ?? "Mon";

  const dayMap: Record<string, number> = {
    Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 0,
  };
  const currentDayNum = dayMap[currentDay] ?? 0;
  const daysUntilMonday =
    currentDayNum === 1 ? 7 : ((8 - currentDayNum) % 7) || 7;

  const nextWeekly = new Date(now.getTime() + daysUntilMonday * 86400000);
  nextWeekly.setHours(9, 0, 0, 0);

  const nextMonth = new Date(now);
  nextMonth.setMonth(nextMonth.getMonth() + 1);
  nextMonth.setDate(1);
  nextMonth.setHours(9, 0, 0, 0);

  return { nextWeekly, nextMonthly: nextMonth };
}
