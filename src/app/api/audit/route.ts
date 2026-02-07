import { NextRequest, NextResponse, after } from "next/server";
import { z } from "zod/v4";
import { db } from "@/lib/db";
import { auditResults, demoSessions } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { success, error } from "@/types";
import { runAuditPipeline } from "@/features/audit";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

export const maxDuration = 60;

const auditRequestSchema = z.object({
  url: z.url(),
  tenantId: z.uuid().optional(),
  demoSessionId: z.uuid().optional(),
});

function normalizeUrl(raw: string): string {
  let url = raw.trim();
  if (!/^https?:\/\//i.test(url)) {
    url = `https://${url}`;
  }
  return url;
}

// POST /api/audit — Run website audit on a given URL
export async function POST(req: NextRequest) {
  try {
    // Rate limit: 5 per IP per minute
    const ip = getClientIp(req);
    const rateLimitError = await rateLimit(`audit:${ip}`, 5, 60);
    if (rateLimitError) return rateLimitError;

    const body = await req.json();

    // Normalize URL before validation
    if (body.url && typeof body.url === "string") {
      body.url = normalizeUrl(body.url);
    }

    const parsed = auditRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        error("Invalid request. Please provide a valid URL."),
        { status: 400 }
      );
    }

    const { url, tenantId, demoSessionId } = parsed.data;

    // Check demo session expiration if provided
    if (demoSessionId) {
      const [session] = await db
        .select({ expiresAt: demoSessions.expiresAt, status: demoSessions.status })
        .from(demoSessions)
        .where(eq(demoSessions.id, demoSessionId))
        .limit(1);

      if (!session) {
        return NextResponse.json(error("Demo session not found"), { status: 404 });
      }
      if (session.status === "expired" || session.expiresAt < new Date()) {
        return NextResponse.json(error("Demo session has expired. Please start a new demo."), { status: 410 });
      }
    }

    // Resume only in-progress audits (completedStage < 4), scoped by user.
    // When demoSessionId is provided, only resume audits linked to that session.
    // When tenantId is provided, only resume audits for that tenant.
    // Otherwise, scope by URL only (anonymous / first-time user).
    let existing: { id: string; completedStage: number } | undefined;

    if (demoSessionId) {
      // Look for an in-progress audit already linked to this demo session
      const rows = await db
        .select({ id: auditResults.id, completedStage: auditResults.completedStage })
        .from(auditResults)
        .innerJoin(demoSessions, eq(demoSessions.auditResultId, auditResults.id))
        .where(and(eq(demoSessions.id, demoSessionId), eq(auditResults.targetUrl, url)))
        .orderBy(desc(auditResults.createdAt))
        .limit(1);
      existing = rows[0];
    } else if (tenantId) {
      const [row] = await db
        .select({ id: auditResults.id, completedStage: auditResults.completedStage })
        .from(auditResults)
        .where(and(eq(auditResults.targetUrl, url), eq(auditResults.tenantId, tenantId)))
        .orderBy(desc(auditResults.createdAt))
        .limit(1);
      existing = row;
    } else {
      const [row] = await db
        .select({ id: auditResults.id, completedStage: auditResults.completedStage })
        .from(auditResults)
        .where(eq(auditResults.targetUrl, url))
        .orderBy(desc(auditResults.createdAt))
        .limit(1);
      existing = row;
    }

    if (existing && (existing.completedStage ?? 0) < 4) {
      // Link demoSession to resumed audit
      if (demoSessionId) {
        await db
          .update(demoSessions)
          .set({ auditResultId: existing.id })
          .where(eq(demoSessions.id, demoSessionId));
      }
      return NextResponse.json(
        success({ auditId: existing.id, resumed: true })
      );
    }

    // Create AuditResult record
    const [auditResult] = await db
      .insert(auditResults)
      .values({
        targetUrl: url,
        tenantId: tenantId ?? null,
      })
      .returning({ id: auditResults.id });

    // Link demoSession to this auditResult
    if (demoSessionId) {
      await db
        .update(demoSessions)
        .set({ auditResultId: auditResult.id })
        .where(eq(demoSessions.id, demoSessionId));
    }

    // Run pipeline after response is sent — `after()` keeps the serverless
    // function alive so the work actually completes on Vercel.
    after(async () => {
      try {
        await runAuditPipeline(auditResult.id, url, () => {});
      } catch (err) {
        console.error(`Audit pipeline failed for ${auditResult.id}:`, err);
      }
    });

    return NextResponse.json(
      success({ auditId: auditResult.id }),
      { status: 202 }
    );
  } catch (err) {
    console.error("Failed to start audit:", err);
    return NextResponse.json(error("Failed to start audit"), { status: 500 });
  }
}
