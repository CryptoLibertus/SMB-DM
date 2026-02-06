/**
 * Cron job handlers for automated report generation and delivery.
 * Processes weekly reports on Mondays and monthly reports on the 1st of each month,
 * respecting each tenant's timezone setting.
 */

import { db } from "@/lib/db";
import { tenants, subscriptions } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { generateWeeklyReport, generateMonthlyReport } from "./reports";
import { sendWeeklyReport, sendMonthlyReport } from "./report-emails";

// ── Timezone helpers ────────────────────────────────────────────────────────────

/**
 * Check if it's currently a specific day and hour in a given timezone.
 */
function isTimeInTimezone(
  tz: string,
  targetDay: number, // 0 = Sunday, 1 = Monday, ...
  targetHour: number
): boolean {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    weekday: "short",
    hour: "numeric",
    hour12: false,
  });

  const parts = formatter.formatToParts(now);
  const weekday = parts.find((p) => p.type === "weekday")?.value;
  const hour = parseInt(parts.find((p) => p.type === "hour")?.value ?? "0", 10);

  const dayMap: Record<string, number> = {
    Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
  };
  const currentDay = dayMap[weekday ?? ""] ?? -1;

  return currentDay === targetDay && hour === targetHour;
}

/**
 * Check if it's the 1st of the month at a specific hour in a timezone.
 */
function isFirstOfMonthInTimezone(tz: string, targetHour: number): boolean {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    day: "numeric",
    hour: "numeric",
    hour12: false,
  });

  const parts = formatter.formatToParts(now);
  const day = parseInt(parts.find((p) => p.type === "day")?.value ?? "0", 10);
  const hour = parseInt(parts.find((p) => p.type === "hour")?.value ?? "0", 10);

  return day === 1 && hour === targetHour;
}

// ── Active tenant fetcher ───────────────────────────────────────────────────────

async function getActiveTenantsWithTimezone() {
  return db
    .select({
      id: tenants.id,
      businessName: tenants.businessName,
      contactEmail: tenants.contactEmail,
      timezone: tenants.timezone,
    })
    .from(tenants)
    .innerJoin(subscriptions, eq(tenants.id, subscriptions.tenantId))
    .where(
      and(
        eq(tenants.status, "active"),
        eq(subscriptions.status, "active")
      )
    );
}

// ── Cron handlers ───────────────────────────────────────────────────────────────

/**
 * Process weekly reports for all active tenants.
 * Should be called by a cron job running every hour.
 * Only generates reports for tenants where it's Monday 9 AM in their timezone.
 */
export async function processWeeklyReports(): Promise<{
  processed: number;
  errors: string[];
}> {
  const activeTenants = await getActiveTenantsWithTimezone();
  let processed = 0;
  const errors: string[] = [];

  for (const tenant of activeTenants) {
    if (!isTimeInTimezone(tenant.timezone, 1, 9)) {
      continue;
    }

    try {
      const report = await generateWeeklyReport(tenant.id);
      await sendWeeklyReport(
        {
          id: tenant.id,
          businessName: tenant.businessName,
          contactEmail: tenant.contactEmail,
        },
        report
      );
      processed++;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unknown error";
      errors.push(`Tenant ${tenant.id}: ${message}`);
      console.error(
        `Failed to process weekly report for tenant ${tenant.id}:`,
        err
      );
    }
  }

  return { processed, errors };
}

/**
 * Process monthly reports for all active tenants.
 * Should be called by a cron job running every hour.
 * Only generates reports for tenants where it's the 1st of the month at 9 AM in their timezone.
 */
export async function processMonthlyReports(): Promise<{
  processed: number;
  errors: string[];
}> {
  const activeTenants = await getActiveTenantsWithTimezone();
  let processed = 0;
  const errors: string[] = [];

  for (const tenant of activeTenants) {
    if (!isFirstOfMonthInTimezone(tenant.timezone, 9)) {
      continue;
    }

    try {
      const report = await generateMonthlyReport(tenant.id);
      await sendMonthlyReport(
        {
          id: tenant.id,
          businessName: tenant.businessName,
          contactEmail: tenant.contactEmail,
        },
        report
      );
      processed++;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unknown error";
      errors.push(`Tenant ${tenant.id}: ${message}`);
      console.error(
        `Failed to process monthly report for tenant ${tenant.id}:`,
        err
      );
    }
  }

  return { processed, errors };
}
