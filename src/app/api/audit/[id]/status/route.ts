import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auditResults, demoSessions, sites, siteVersions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { success, error } from "@/types";

export const maxDuration = 60;

// GET /api/audit/[id]/status — Poll for audit progress (replaces SSE)
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Single query: auditResult + demoSession via LEFT JOIN
  const rows = await db
    .select({
      audit: auditResults,
      contactEmail: demoSessions.contactEmail,
    })
    .from(auditResults)
    .leftJoin(demoSessions, eq(demoSessions.auditResultId, auditResults.id))
    .where(eq(auditResults.id, id))
    .limit(1);

  if (rows.length === 0) {
    return NextResponse.json(error("Audit not found"), { status: 404 });
  }

  const { audit: row, contactEmail } = rows[0];

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
  // Combined: site + siteVersions via LEFT JOIN
  let generation: {
    generationId: string;
    stage: string;
    versions: { id: string; versionNumber: number; status: string; previewUrl: string | null; designMeta: unknown; progressStage: string | null; progressMessage: string | null }[];
  } | undefined;

  if (isComplete && row.tenantId) {
    const siteWithVersions = await db
      .select({
        siteId: sites.id,
        generationId: sites.generationId,
        versionId: siteVersions.id,
        versionNumber: siteVersions.versionNumber,
        versionStatus: siteVersions.status,
        previewUrl: siteVersions.previewUrl,
        designMeta: siteVersions.designMeta,
        progressStage: siteVersions.progressStage,
        progressMessage: siteVersions.progressMessage,
      })
      .from(sites)
      .leftJoin(siteVersions, eq(siteVersions.siteId, sites.id))
      .where(eq(sites.tenantId, row.tenantId));

    if (siteWithVersions.length > 0 && siteWithVersions[0].generationId) {
      const versions = siteWithVersions
        .filter((r) => r.versionId !== null)
        .map((r) => ({
          id: r.versionId!,
          versionNumber: r.versionNumber!,
          status: r.versionStatus!,
          previewUrl: r.previewUrl || null,
          designMeta: r.designMeta,
          progressStage: r.progressStage,
          progressMessage: r.progressMessage,
        }));

      const readyCount = versions.filter((v) => v.status === "ready").length;
      const generatingCount = versions.filter((v) => v.status === "generating").length;
      const genComplete = generatingCount === 0 && versions.length > 0;

      generation = {
        generationId: siteWithVersions[0].generationId,
        stage: genComplete ? (readyCount > 0 ? "complete" : "error") : "generating",
        versions,
      };
    }
  }

  return NextResponse.json(
    success({
      stage,
      stageNumber,
      totalStages: 4,
      isComplete,
      contactEmail: contactEmail ?? null,
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
