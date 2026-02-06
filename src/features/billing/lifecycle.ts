import { db } from "@/lib/db";
import { subscriptions, sites, tenants } from "@/db/schema";
import { eq, and, lt, isNotNull } from "drizzle-orm";
import { deploySiteVersion } from "@/features/generation/deploy";
import {
  sendSitePausedEmail,
  sendArchivedEmail,
} from "./lifecycle-emails";

/**
 * Check subscriptions that are past_due for >7 days.
 * Set site to "paused" and send a paused email.
 * Called by a Vercel Cron job.
 */
export async function checkGracePeriods(): Promise<void> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  // Find past_due subscriptions older than 7 days
  const overdueSubscriptions = await db
    .select()
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.status, "past_due"),
        lt(subscriptions.currentPeriodEnd, sevenDaysAgo)
      )
    );

  for (const sub of overdueSubscriptions) {
    // Pause the subscription
    await db
      .update(subscriptions)
      .set({ status: "paused" })
      .where(eq(subscriptions.id, sub.id));

    // Pause the site
    await db
      .update(sites)
      .set({ status: "paused", updatedAt: new Date() })
      .where(eq(sites.tenantId, sub.tenantId));

    // Pause the tenant
    await db
      .update(tenants)
      .set({ status: "paused", updatedAt: new Date() })
      .where(eq(tenants.id, sub.tenantId));

    // Send paused email
    const [tenant] = await db
      .select()
      .from(tenants)
      .where(eq(tenants.id, sub.tenantId))
      .limit(1);

    if (tenant) {
      try {
        await sendSitePausedEmail(tenant);
      } catch (err) {
        console.error(
          `Failed to send paused email for tenant ${sub.tenantId}:`,
          err
        );
      }
    }
  }
}

/**
 * Check sites paused for >30 days.
 * Set to "archived", release domain, send archived email.
 * Called by a Vercel Cron job.
 */
export async function checkArchival(): Promise<void> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  // Find paused sites that have been paused for >30 days
  const pausedSites = await db
    .select()
    .from(sites)
    .where(
      and(
        eq(sites.status, "paused"),
        lt(sites.updatedAt, thirtyDaysAgo)
      )
    );

  for (const site of pausedSites) {
    // Archive the site and release domain
    await db
      .update(sites)
      .set({
        status: "archived",
        primaryDomain: null,
        updatedAt: new Date(),
      })
      .where(eq(sites.id, site.id));

    // Archive the tenant
    await db
      .update(tenants)
      .set({ status: "archived", updatedAt: new Date() })
      .where(eq(tenants.id, site.tenantId));

    // Send archived email
    const [tenant] = await db
      .select()
      .from(tenants)
      .where(eq(tenants.id, site.tenantId))
      .limit(1);

    if (tenant) {
      try {
        await sendArchivedEmail(tenant);
      } catch (err) {
        console.error(
          `Failed to send archived email for tenant ${site.tenantId}:`,
          err
        );
      }
    }
  }
}

/**
 * Reactivate a subscription for a tenant.
 * Restores the last deployment if data still exists (<90 days).
 */
export async function reactivateSubscription(
  tenantId: string
): Promise<boolean> {
  const [site] = await db
    .select()
    .from(sites)
    .where(eq(sites.tenantId, tenantId))
    .limit(1);

  if (!site || !site.selectedVersionId) {
    return false;
  }

  // Check if within 90-day retention window
  const daysSincePaused =
    (Date.now() - new Date(site.updatedAt).getTime()) / (1000 * 60 * 60 * 24);

  if (daysSincePaused > 90) {
    return false;
  }

  // Restore deployment
  await deploySiteVersion(site.id, site.selectedVersionId, "initial");

  // Restore site status
  await db
    .update(sites)
    .set({ status: "live", updatedAt: new Date() })
    .where(eq(sites.id, site.id));

  // Restore tenant status
  await db
    .update(tenants)
    .set({ status: "active", updatedAt: new Date() })
    .where(eq(tenants.id, tenantId));

  // Restore subscription status
  await db
    .update(subscriptions)
    .set({ status: "active" })
    .where(eq(subscriptions.tenantId, tenantId));

  return true;
}
