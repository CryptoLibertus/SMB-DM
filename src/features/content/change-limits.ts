import { db } from "@/lib/db";
import { changeRequests, sites } from "@/db/schema";
import { eq, and, gte, sql } from "drizzle-orm";

export const MAX_MONTHLY_REQUESTS = 5;
export const MAX_REVISIONS = 3;

/**
 * Count change requests this billing month for a site.
 */
export async function getMonthlyRequestCount(siteId: string): Promise<number> {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const result = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(changeRequests)
    .where(
      and(
        eq(changeRequests.siteId, siteId),
        gte(changeRequests.createdAt, startOfMonth)
      )
    );

  return result[0]?.count ?? 0;
}

/**
 * Check whether a site can create a new change request this month.
 */
export async function checkRequestLimit(
  siteId: string
): Promise<{ allowed: boolean; count: number; limit: number }> {
  const count = await getMonthlyRequestCount(siteId);
  return {
    allowed: count < MAX_MONTHLY_REQUESTS,
    count,
    limit: MAX_MONTHLY_REQUESTS,
  };
}

/**
 * Get the site ID for a given tenant.
 */
export async function getSiteForTenant(
  tenantId: string
): Promise<{ id: string; vercelProjectId: string } | null> {
  const [site] = await db
    .select({ id: sites.id, vercelProjectId: sites.vercelProjectId })
    .from(sites)
    .where(eq(sites.tenantId, tenantId))
    .limit(1);

  return site ?? null;
}
