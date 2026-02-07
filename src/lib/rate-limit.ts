import { db } from "./db";
import { rateLimitHits } from "@/db/schema";
import { and, eq, gte, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { error } from "@/types";

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

/**
 * Check rate limit using a sliding window backed by the database.
 *
 * @param key - Unique key for the rate limit (e.g., "audit:127.0.0.1")
 * @param limit - Maximum number of requests allowed
 * @param windowSeconds - Time window in seconds
 */
export async function checkRateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  const windowStart = new Date(Date.now() - windowSeconds * 1000);

  // Count hits in the current window
  const [result] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(rateLimitHits)
    .where(
      and(eq(rateLimitHits.key, key), gte(rateLimitHits.createdAt, windowStart))
    );

  const count = result?.count ?? 0;

  if (count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: windowSeconds,
    };
  }

  // Record the hit
  await db.insert(rateLimitHits).values({ key });

  return {
    allowed: true,
    remaining: limit - count - 1,
    retryAfterSeconds: 0,
  };
}

/**
 * Apply rate limiting to an API route. Returns a 429 response if rate is exceeded,
 * or null if the request is allowed.
 */
export async function rateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<NextResponse | null> {
  const result = await checkRateLimit(key, limit, windowSeconds);

  if (!result.allowed) {
    return NextResponse.json(error("Too many requests. Please try again later."), {
      status: 429,
      headers: {
        "Retry-After": String(result.retryAfterSeconds),
        "X-RateLimit-Limit": String(limit),
        "X-RateLimit-Remaining": "0",
      },
    });
  }

  return null;
}

/**
 * Extract the client IP from a Next.js request.
 */
export function getClientIp(req: Request): string {
  // Vercel sets x-forwarded-for
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  return "unknown";
}
