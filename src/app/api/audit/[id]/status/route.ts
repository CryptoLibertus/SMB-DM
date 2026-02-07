import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auditResults, sites, siteVersions } from "@/db/schema";
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

  // When audit is complete and has a tenant, look up generation state
  let generation: {
    generationId: string;
    stage: string;
    versions: { id: string; versionNumber: number; status: string; previewUrl: string | null; designMeta: unknown }[];
  } | undefined;

  if (isComplete && row.tenantId) {
    const [site] = await db
      .select()
      .from(sites)
      .where(eq(sites.tenantId, row.tenantId))
      .limit(1);

    if (site && site.generationId) {
      const versions = await db
        .select()
        .from(siteVersions)
        .where(eq(siteVersions.siteId, site.id));

      const readyCount = versions.filter((v) => v.status === "ready").length;
      const generatingCount = versions.filter((v) => v.status === "generating").length;
      const genComplete = generatingCount === 0 && versions.length > 0;

      generation = {
        generationId: site.generationId,
        stage: genComplete ? (readyCount > 0 ? "complete" : "error") : "generating",
        versions: versions.map((v) => ({
          id: v.id,
          versionNumber: v.versionNumber,
          status: v.status,
          previewUrl: v.previewUrl || null,
          designMeta: v.designMeta,
        })),
      };
    }
  }

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
        extractedImages: row.extractedImages,
        screenshotDesktop: row.screenshotDesktop,
        screenshotMobile: row.screenshotMobile,
        targetUrl: row.targetUrl,
      },
      aiAnalysis: row.aiAnalysis ?? null,
      aiAnalysisStatus: row.aiAnalysisStatus ?? null,
      ...(generation ? { generation } : {}),
    })
  );
}
