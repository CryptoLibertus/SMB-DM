import { db } from "@/lib/db";
import { auditResults } from "@/db/schema";
import { eq } from "drizzle-orm";
import { crawlUrl, storeScreenshot } from "./crawler";
import {
  analyzeSeo,
  analyzeMobile,
  analyzeAnalytics,
  analyzeCta,
  analyzeDns,
} from "./analyzers";
import type { AuditStageEvent, AuditPipelineResult } from "./types";

const TOTAL_STAGES = 4;

type StageCallback = (event: AuditStageEvent) => void;

/**
 * Run the full audit pipeline for a URL.
 * Calls `onStage` with progress events at each stage so the API can stream them via SSE.
 * Returns the final audit result ID.
 */
export async function runAuditPipeline(
  auditId: string,
  targetUrl: string,
  onStage: StageCallback
): Promise<void> {
  const partial: Partial<AuditPipelineResult> = {};

  // ── Stage 1: Crawl + SEO ────────────────────────────────────────────────
  onStage({
    stage: 1,
    totalStages: TOTAL_STAGES,
    stageName: "crawling",
    message: "Analyzing your website\u2026",
    auditId,
  });

  const crawlResult = await crawlUrl(targetUrl);

  // Store screenshots
  let screenshotDesktop: string | null = null;
  let screenshotMobile: string | null = null;

  if (crawlResult.screenshotDesktopBuffer) {
    screenshotDesktop = await storeScreenshot(
      crawlResult.screenshotDesktopBuffer,
      auditId,
      "desktop"
    );
  }
  if (crawlResult.screenshotMobileBuffer) {
    screenshotMobile = await storeScreenshot(
      crawlResult.screenshotMobileBuffer,
      auditId,
      "mobile"
    );
  }

  partial.screenshotDesktop = screenshotDesktop;
  partial.screenshotMobile = screenshotMobile;

  // SEO analysis (runs during stage 1)
  const seo = await analyzeSeo(crawlResult.html, targetUrl);
  partial.seoScore = seo.seoScore;
  partial.metaTags = seo.metaTags;

  // Analytics detection (fast, runs with SEO)
  const analytics = analyzeAnalytics(crawlResult.html);
  partial.analyticsDetected = analytics;

  onStage({
    stage: 1,
    totalStages: TOTAL_STAGES,
    stageName: "seo",
    message: "Analyzing your website\u2026",
    auditId,
    partialResults: { ...partial },
  });

  // Update DB with partial results
  await db
    .update(auditResults)
    .set({
      seoScore: seo.seoScore,
      metaTags: seo.metaTags,
      analyticsDetected: analytics,
      screenshotDesktop,
      screenshotMobile,
    })
    .where(eq(auditResults.id, auditId));

  // ── Stage 2: Mobile ──────────────────────────────────────────────────
  onStage({
    stage: 2,
    totalStages: TOTAL_STAGES,
    stageName: "mobile",
    message: "Checking mobile experience\u2026",
    auditId,
    partialResults: { ...partial },
  });

  const mobile = await analyzeMobile(crawlResult.html, targetUrl);
  partial.mobileScore = mobile.mobileScore;

  await db
    .update(auditResults)
    .set({ mobileScore: mobile.mobileScore })
    .where(eq(auditResults.id, auditId));

  // ── Stage 3: CTA ─────────────────────────────────────────────────────
  onStage({
    stage: 3,
    totalStages: TOTAL_STAGES,
    stageName: "cta",
    message: "Evaluating calls-to-action\u2026",
    auditId,
    partialResults: { ...partial },
  });

  const cta = analyzeCta(crawlResult.html);
  partial.ctaAnalysis = cta;

  await db
    .update(auditResults)
    .set({ ctaAnalysis: cta })
    .where(eq(auditResults.id, auditId));

  // ── Stage 4: DNS ──────────────────────────────────────────────────────
  onStage({
    stage: 4,
    totalStages: TOTAL_STAGES,
    stageName: "dns",
    message: "Checking domain configuration\u2026",
    auditId,
    partialResults: { ...partial },
  });

  const dns = await analyzeDns(targetUrl);
  partial.dnsInfo = dns;

  await db
    .update(auditResults)
    .set({ dnsInfo: dns })
    .where(eq(auditResults.id, auditId));

  // ── Complete ──────────────────────────────────────────────────────────
  const finalResults: AuditPipelineResult = {
    seoScore: seo.seoScore,
    mobileScore: mobile.mobileScore,
    ctaAnalysis: cta,
    metaTags: seo.metaTags,
    analyticsDetected: analytics,
    dnsInfo: dns,
    screenshotDesktop,
    screenshotMobile,
  };

  onStage({
    stage: TOTAL_STAGES,
    totalStages: TOTAL_STAGES,
    stageName: "complete",
    message: "Audit complete!",
    auditId,
    partialResults: finalResults,
  });
}
