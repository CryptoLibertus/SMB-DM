import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auditResults } from "@/db/schema";
import { eq } from "drizzle-orm";
import { success, error } from "@/types";

export const maxDuration = 60;

// GET /api/audit/[id]/status — Poll for audit progress (replaces SSE)
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const rows = await db
    .select()
    .from(auditResults)
    .where(eq(auditResults.id, id))
    .limit(1);

  if (rows.length === 0) {
    return NextResponse.json(error("Audit not found"), { status: 404 });
  }

  const row = rows[0];

  // Determine the current stage from the completedStage counter
  const completed = row.completedStage ?? 0;
  let stage: string;
  let stageNumber: number;

  if (completed >= 4) {
    stage = "complete";
    stageNumber = 4;
  } else if (completed === 3) {
    stage = "dns";
    stageNumber = 4;
  } else if (completed === 2) {
    stage = "cta";
    stageNumber = 3;
  } else if (completed === 1) {
    stage = "mobile";
    stageNumber = 2;
  } else {
    stage = "crawling";
    stageNumber = 1;
  }

  const isComplete = completed >= 4;

  return NextResponse.json(
    success({
      stage,
      stageNumber,
      totalStages: 4,
      isComplete,
      auditResult: {
        seoScore: row.seoScore,
        mobileScore: row.mobileScore,
        ctaAnalysis: row.ctaAnalysis,
        metaTags: row.metaTags,
        analyticsDetected: row.analyticsDetected,
        dnsInfo: row.dnsInfo,
        screenshotDesktop: row.screenshotDesktop,
        screenshotMobile: row.screenshotMobile,
        targetUrl: row.targetUrl,
      },
    })
  );
}
