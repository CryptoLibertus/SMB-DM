/**
 * Analytics API for the SMB dashboard.
 * Queries PostHog API for visitor metrics, lead counts, top pages, and trends.
 * Results are cached for 5 minutes to stay under the <3s response time target.
 */

import { z } from "zod/v4";

// ── Types ───────────────────────────────────────────────────────────────────────

export const dateRangeSchema = z.object({
  startDate: z.string().date(),
  endDate: z.string().date(),
});

export type DateRange = z.infer<typeof dateRangeSchema>;

export interface LeadsByType {
  phone_click: number;
  email_click: number;
  form_submit: number;
  cta_click: number;
}

export interface TopPage {
  url: string;
  views: number;
}

export interface TrendDataPoint {
  date: string;
  visits: number;
}

export interface AnalyticsData {
  totalVisits: number;
  uniqueVisitors: number;
  leads: LeadsByType;
  topPages: TopPage[];
  trend: TrendDataPoint[];
}

// ── Cache ───────────────────────────────────────────────────────────────────────

interface CacheEntry {
  data: AnalyticsData;
  expiresAt: number;
}

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const cache = new Map<string, CacheEntry>();

function getCacheKey(tenantId: string, dateRange: DateRange): string {
  return `${tenantId}:${dateRange.startDate}:${dateRange.endDate}`;
}

function getCached(key: string): AnalyticsData | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache(key: string, data: AnalyticsData): void {
  cache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
}

// ── PostHog API helpers ─────────────────────────────────────────────────────────

function getPostHogConfig() {
  const apiKey = process.env.POSTHOG_API_KEY;
  const projectId = process.env.POSTHOG_PROJECT_ID;
  const host = process.env.POSTHOG_HOST || "https://us.i.posthog.com";
  if (!apiKey) throw new Error("POSTHOG_API_KEY is not set");
  if (!projectId) throw new Error("POSTHOG_PROJECT_ID is not set");
  return { apiKey, projectId, host };
}

async function posthogQuery<T>(
  endpoint: string,
  body: Record<string, unknown>
): Promise<T> {
  const { apiKey, projectId, host } = getPostHogConfig();
  const url = `${host}/api/projects/${projectId}${endpoint}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`PostHog API error ${response.status}: ${text}`);
  }

  return response.json() as Promise<T>;
}

// ── Trend query (for total visits + daily trend) ────────────────────────────────

interface PostHogTrendResult {
  result: Array<{
    data: number[];
    days: string[];
    count: number;
  }>;
}

async function queryTrend(
  tenantId: string,
  dateRange: DateRange,
  eventName: string
): Promise<{ total: number; daily: TrendDataPoint[] }> {
  const result = await posthogQuery<PostHogTrendResult>("/insights/trend/", {
    events: [
      {
        id: eventName,
        type: "events",
        properties: [
          {
            key: "tenant_id",
            value: tenantId,
            type: "event",
            operator: "exact",
          },
        ],
      },
    ],
    date_from: dateRange.startDate,
    date_to: dateRange.endDate,
    interval: "day",
  });

  const series = result.result[0];
  if (!series) {
    return { total: 0, daily: [] };
  }

  const daily = series.days.map((date, i) => ({
    date,
    visits: series.data[i] ?? 0,
  }));

  return { total: series.count, daily };
}

// ── HogQL query (for unique visitors, leads, top pages) ─────────────────────────

interface PostHogQueryResult {
  results: unknown[][];
}

async function queryHogQL(query: string): Promise<unknown[][]> {
  const result = await posthogQuery<PostHogQueryResult>("/query/", {
    query: {
      kind: "HogQLQuery",
      query,
    },
  });
  return result.results;
}

async function queryUniqueVisitors(
  tenantId: string,
  dateRange: DateRange
): Promise<number> {
  const rows = await queryHogQL(
    `SELECT count(DISTINCT distinct_id)
     FROM events
     WHERE event = '$pageview'
       AND properties.tenant_id = '${tenantId}'
       AND timestamp >= '${dateRange.startDate}'
       AND timestamp <= '${dateRange.endDate} 23:59:59'`
  );
  const count = rows[0]?.[0];
  return typeof count === "number" ? count : 0;
}

async function queryLeadsByType(
  tenantId: string,
  dateRange: DateRange
): Promise<LeadsByType> {
  const rows = await queryHogQL(
    `SELECT event, count()
     FROM events
     WHERE event IN ('phone_click', 'email_click', 'form_submit', 'cta_click')
       AND properties.tenant_id = '${tenantId}'
       AND timestamp >= '${dateRange.startDate}'
       AND timestamp <= '${dateRange.endDate} 23:59:59'
     GROUP BY event`
  );

  const leads: LeadsByType = {
    phone_click: 0,
    email_click: 0,
    form_submit: 0,
    cta_click: 0,
  };

  for (const row of rows) {
    const eventName = row[0] as string;
    const count = row[1] as number;
    if (eventName in leads) {
      leads[eventName as keyof LeadsByType] = count;
    }
  }

  return leads;
}

async function queryTopPages(
  tenantId: string,
  dateRange: DateRange
): Promise<TopPage[]> {
  const rows = await queryHogQL(
    `SELECT properties.$current_url AS url, count() AS views
     FROM events
     WHERE event = '$pageview'
       AND properties.tenant_id = '${tenantId}'
       AND timestamp >= '${dateRange.startDate}'
       AND timestamp <= '${dateRange.endDate} 23:59:59'
     GROUP BY url
     ORDER BY views DESC
     LIMIT 10`
  );

  return rows.map((row) => ({
    url: (row[0] as string) || "Unknown",
    views: (row[1] as number) || 0,
  }));
}

// ── Main analytics function ─────────────────────────────────────────────────────

/**
 * Get analytics data for a tenant over a date range.
 * Results are cached for 5 minutes.
 */
export async function getAnalyticsData(
  tenantId: string,
  dateRange: DateRange
): Promise<AnalyticsData> {
  const cacheKey = getCacheKey(tenantId, dateRange);
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const [trendData, uniqueVisitors, leads, topPages] = await Promise.all([
    queryTrend(tenantId, dateRange, "$pageview"),
    queryUniqueVisitors(tenantId, dateRange),
    queryLeadsByType(tenantId, dateRange),
    queryTopPages(tenantId, dateRange),
  ]);

  const data: AnalyticsData = {
    totalVisits: trendData.total,
    uniqueVisitors,
    leads,
    topPages,
    trend: trendData.daily,
  };

  setCache(cacheKey, data);
  return data;
}
