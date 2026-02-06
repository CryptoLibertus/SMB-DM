import { NextRequest, NextResponse, after } from "next/server";
import { z } from "zod/v4";
import { db } from "@/lib/db";
import { auditResults } from "@/db/schema";
import { success, error } from "@/types";
import { runAuditPipeline } from "@/features/audit";

export const maxDuration = 60;

const auditRequestSchema = z.object({
  url: z.url(),
  tenantId: z.uuid().optional(),
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

    const { url, tenantId } = parsed.data;

    // Create AuditResult record
    const [auditResult] = await db
      .insert(auditResults)
      .values({
        targetUrl: url,
        tenantId: tenantId ?? null,
      })
      .returning({ id: auditResults.id });

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
