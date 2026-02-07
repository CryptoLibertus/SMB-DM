"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import ProgressBar from "@/components/ProgressBar";
import AuditResultCard from "@/components/AuditResultCard";
import AiAnalysisCard from "@/components/AiAnalysisCard";
import FloatingCTA from "@/components/FloatingCTA";
import BusinessInfoForm from "@/components/BusinessInfoForm";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

// ── Audit stages for ProgressBar ────────────────────────────────────────────
const AUDIT_STAGES = [
  { label: "Crawling", description: "Fetching & analyzing your site" },
  { label: "Mobile", description: "Checking mobile experience" },
  { label: "CTAs", description: "Evaluating calls-to-action" },
  { label: "DNS", description: "Checking domain config" },
];

const GENERATION_STAGES = [
  { label: "Preparing", description: "Setting up your new site" },
  { label: "Generating", description: "Building your custom website" },
];

// ── Types ───────────────────────────────────────────────────────────────────
interface AuditResult {
  seoScore: number;
  mobileScore: number;
  ctaCount: number;
  hasAnalytics: boolean;
  targetUrl: string;
  metaTags?: {
    title: string | null;
    description: string | null;
    h1s: string[];
    robots: string | null;
  };
  analyticsDetected?: { ga4: boolean; gtm: boolean; other: string[] };
}

interface SitePreview {
  id: string;
  previewUrl: string;
  status: "generating" | "ready" | "failed";
}

type Phase = "auditing" | "audit_done" | "generating" | "version_ready" | "error";
type ErrorSource = "audit" | "generation";

const POLL_INTERVAL_MS = 2_000;
const AI_POLL_INTERVAL_MS = 3_000;
const MIN_AUDIT_DISPLAY_MS = 4_000; // show progress bar for at least 4s

const SUBSCRIPTION_INCLUDES = [
  "Managed hosting & daily backups",
  "2 SEO blog posts per week",
  "Built-in analytics dashboard",
  "Custom domain with free SSL",
];

export default function DemoPage() {
  const params = useParams();
  const router = useRouter();
  const auditId = params.token as string;
  const formRef = useRef<HTMLDivElement>(null);

  // ── State ──────────────────────────────────────────────────────────────
  const [phase, setPhase] = useState<Phase>("auditing");
  const [auditStage, setAuditStage] = useState(0);
  const [genStage, setGenStage] = useState(0);
  const [auditResult, setAuditResult] = useState<AuditResult | null>(null);
  const [sitePreview, setSitePreview] = useState<SitePreview | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorSource, setErrorSource] = useState<ErrorSource>("audit");
  const [retryCount, setRetryCount] = useState(0);
  const [generationId, setGenerationId] = useState<string | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<{
    summary: string;
    overallGrade: string;
    findings: {
      category: string;
      severity: "critical" | "warning" | "info";
      title: string;
      detail: string;
      recommendation: string;
    }[];
    topPriorities: string[];
    detectedIndustry?: string;
    detectedServices?: string[];
    detectedLocations?: string[];
    detectedBusinessName?: string;
  } | null>(null);
  const [aiAnalysisStatus, setAiAnalysisStatus] = useState<string | null>(null);
  const [contactEmail, setContactEmail] = useState<string | null>(null);

  // ── Scroll to business form ─────────────────────────────────────────────
  const scrollToForm = useCallback(() => {
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, []);

  // ── Audit polling ──────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    const mountedAt = Date.now();
    let basicAuditDone = false;

    async function poll() {
      while (!cancelled) {
        try {
          const res = await fetch(`/api/audit/${auditId}/status`);
          if (!res.ok) {
            await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
            continue;
          }

          const json = await res.json();
          if (json.error) {
            setErrorMessage(json.error);
            setErrorSource("audit");
            setPhase("error");
            return;
          }

          const data = json.data;

          if (data.contactEmail) {
            setContactEmail(data.contactEmail);
          }

          if (typeof data.stageNumber === "number") {
            setAuditStage(data.stageNumber);
          }

          if (data.auditResult) {
            const p = data.auditResult;
            setAuditResult({
              seoScore: p.seoScore ?? 0,
              mobileScore: p.mobileScore ?? 0,
              ctaCount: p.ctaAnalysis?.elements?.length ?? 0,
              hasAnalytics: p.analyticsDetected
                ? p.analyticsDetected.ga4 || p.analyticsDetected.gtm
                : false,
              targetUrl: p.targetUrl ?? "",
              metaTags: p.metaTags,
              analyticsDetected: p.analyticsDetected,
            });
          }

          // Track AI analysis status
          if (data.aiAnalysisStatus) {
            setAiAnalysisStatus(data.aiAnalysisStatus);
          }
          if (data.aiAnalysis) {
            setAiAnalysis(data.aiAnalysis);
          }

          if (data.isComplete) {
            // Phase transition only on first time seeing isComplete
            if (!basicAuditDone) {
              // Ensure the progress bar is visible for a minimum duration
              // so fast audits don't look like nothing happened.
              const elapsed = Date.now() - mountedAt;
              if (elapsed < MIN_AUDIT_DISPLAY_MS) {
                // Animate through remaining stages before transitioning
                const remaining = MIN_AUDIT_DISPLAY_MS - elapsed;
                const stageDelay = remaining / AUDIT_STAGES.length;
                for (let i = 0; i <= AUDIT_STAGES.length && !cancelled; i++) {
                  setAuditStage(i);
                  await new Promise((r) => setTimeout(r, stageDelay));
                }
              }

              if (cancelled) return;

              if (data.generation) {
                const gen = data.generation;
                setGenerationId(gen.generationId);
                const v = gen.versions[0];
                if (v) {
                  setSitePreview({
                    id: v.id,
                    previewUrl: v.previewUrl || "about:blank",
                    status: v.status,
                  });
                }

                if (gen.stage === "complete") {
                  setPhase("version_ready");
                } else {
                  setPhase("generating");
                }
              } else {
                setPhase("audit_done");
              }

              basicAuditDone = true;
            }

            // Continue polling for AI analysis if it hasn't completed yet
            const aiStatus = data.aiAnalysisStatus;
            if (aiStatus === "pending" || aiStatus === "analyzing") {
              // Keep polling at slower interval for AI analysis
            } else {
              return;
            }
          }
        } catch {
          // Network error, keep trying
        }

        await new Promise((r) =>
          setTimeout(r, basicAuditDone ? AI_POLL_INTERVAL_MS : POLL_INTERVAL_MS)
        );
      }
    }

    poll();

    return () => {
      cancelled = true;
    };
  }, [auditId, retryCount]);

  // ── Generation polling ─────────────────────────────────────────────────
  useEffect(() => {
    if (!generationId) return;
    let cancelled = false;

    async function pollGen() {
      while (!cancelled) {
        try {
          const res = await fetch(`/api/generate/${generationId}/status`);
          if (!res.ok) {
            await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
            continue;
          }

          const json = await res.json();
          if (json.error) {
            setErrorMessage(json.error);
            setErrorSource("generation");
            setPhase("error");
            return;
          }

          const data = json.data;

          if (data.versions && data.versions.length > 0) {
            const v = data.versions[0];
            setSitePreview({
              id: v.id,
              previewUrl: v.previewUrl || "about:blank",
              status: v.status,
            });

            if (v.status === "ready") {
              setGenStage(2);
            } else {
              setGenStage(1);
            }
          }

          if (data.isComplete) {
            if (data.stage === "complete") {
              setPhase("version_ready");
            } else {
              setErrorMessage("Failed to generate your website");
              setErrorSource("generation");
              setPhase("error");
            }
            return;
          }
        } catch {
          // Network error, keep trying
        }

        await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
      }
    }

    pollGen();

    return () => {
      cancelled = true;
    };
  }, [generationId]);

  // ── Start generation ───────────────────────────────────────────────────
  const handleBusinessInfoSubmit = useCallback(
    async (info: {
      businessName: string;
      industry: string;
      services: string[];
      locations: string[];
      contactEmail: string;
    }) => {
      setPhase("generating");
      setErrorMessage(null);
      setSitePreview({ id: "pending", previewUrl: "about:blank", status: "generating" });

      try {
        const res = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            auditResultId: auditId,
            businessContext: {
              businessName: info.businessName,
              industry: info.industry,
              services: info.services,
              locations: info.locations,
              phone: null,
              contactEmail: info.contactEmail,
              targetKeywords: [],
            },
            aiAnalysis: aiAnalysis
              ? {
                  summary: aiAnalysis.summary,
                  overallGrade: aiAnalysis.overallGrade,
                  findings: aiAnalysis.findings,
                  topPriorities: aiAnalysis.topPriorities,
                }
              : null,
          }),
        });

        const data = await res.json();
        if (!res.ok || data.error) {
          setErrorMessage(data.error || "Failed to start generation");
          setErrorSource("generation");
          setPhase("error");
          return;
        }

        setGenerationId(data.data.generationId);
      } catch {
        setErrorMessage("Failed to start generation. Please try again.");
        setErrorSource("generation");
        setPhase("error");
      }
    },
    [auditId, aiAnalysis]
  );

  // ── Go live → checkout ──────────────────────────────────────────────
  const handleGoLive = () => {
    if (sitePreview) {
      router.push(`/checkout?auditId=${auditId}&version=${sitePreview.id}`);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background">
      {/* ─── Dark header ─── */}
      <section className="relative bg-surface-dark text-white">
        <div className="grid-bg pointer-events-none absolute inset-0" />

        <nav className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <Link href="/" className="text-lg font-bold tracking-tight">
            SMB<span className="text-accent">-DM</span>
          </Link>
          <Link
            href="/login"
            className="text-sm font-medium text-text-light transition-colors hover:text-white"
          >
            Sign in
          </Link>
        </nav>

        <div className="relative z-10 mx-auto max-w-3xl px-6 pb-12 pt-8 text-center sm:pb-16 sm:pt-12">
          <h1 className="text-2xl font-extrabold leading-tight tracking-tight sm:text-3xl lg:text-4xl">
            {phase === "auditing" || phase === "audit_done"
              ? "Analyzing Your Website"
              : phase === "generating"
                ? "Building Your New Website"
                : phase === "version_ready"
                  ? "Your New Website Is Ready"
                  : "Website Refresh"}
          </h1>
          <p className="mt-3 text-base text-text-light">
            {phase === "auditing"
              ? "We\u2019re crawling your site and running a full audit..."
              : phase === "audit_done"
                ? "Audit complete! Tell us about your business to generate your new site."
                : phase === "generating"
                  ? "Creating a custom design tailored to your business..."
                  : phase === "version_ready"
                    ? "Preview your new site and go live in minutes."
                    : ""}
          </p>
        </div>
      </section>

      {/* ─── Content ─── */}
      <div className="mx-auto max-w-4xl px-4 py-8 pb-24">
        {/* Error state */}
        {phase === "error" && (
          <div className="mb-8 rounded-xl border border-red-300/30 bg-red-50 p-6 text-center">
            <p className="font-medium text-red-800">
              {errorMessage || "Something went wrong"}
            </p>
            <button
              onClick={() => {
                setErrorMessage(null);
                if (errorSource === "generation") {
                  // Go back to audit_done so user can re-submit
                  setGenerationId(null);
                  setSitePreview(null);
                  setGenStage(0);
                  setPhase("audit_done");
                } else {
                  // Re-poll audit — increment retryCount to re-trigger the effect
                  setAuditStage(0);
                  setRetryCount((c) => c + 1);
                  setPhase("auditing");
                }
              }}
              className="mt-3 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover"
            >
              {errorSource === "generation" ? "Try Generating Again" : "Retry Audit"}
            </button>
            <p className="mt-3 text-xs text-text-muted">
              Having trouble?{" "}
              <a href="mailto:support@smb-dm.com" className="text-accent underline hover:text-accent-hover">
                Email support@smb-dm.com
              </a>
            </p>
          </div>
        )}

        {/* Audit progress */}
        {phase === "auditing" && (
          <div className="mb-8">
            <ProgressBar
              currentStage={auditStage}
              stages={AUDIT_STAGES}
              timeEstimate="This usually takes about 60 seconds..."
            />
            <p className="mt-2 text-center text-xs text-text-muted">
              Your data is analyzed securely and never shared.
            </p>

            {/* Skeleton preview of audit results */}
            <div className="mt-8 animate-pulse rounded-xl border border-border-subtle bg-white p-6">
              <div className="mb-4 h-5 w-40 rounded bg-border-subtle" />
              <div className="grid gap-4 sm:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex flex-col items-center gap-2">
                    <div className="h-12 w-12 rounded-full bg-border-subtle" />
                    <div className="h-3 w-16 rounded bg-border-subtle" />
                  </div>
                ))}
              </div>
              <div className="mt-4 space-y-2">
                <div className="h-3 w-full rounded bg-border-subtle" />
                <div className="h-3 w-3/4 rounded bg-border-subtle" />
              </div>
            </div>
          </div>
        )}

        {/* Audit results */}
        {auditResult && auditResult.seoScore > 0 && (
          <div className="mb-8">
            <AuditResultCard
              seoScore={auditResult.seoScore}
              mobileScore={auditResult.mobileScore}
              ctaCount={auditResult.ctaCount}
              hasAnalytics={auditResult.hasAnalytics}
              targetUrl={auditResult.targetUrl}
              metaTags={auditResult.metaTags}
              analyticsDetected={auditResult.analyticsDetected}
              onGenerateClick={phase === "audit_done" ? scrollToForm : undefined}
            />
          </div>
        )}

        {/* AI Analysis */}
        {phase !== "auditing" && aiAnalysisStatus && !aiAnalysis && aiAnalysisStatus !== "failed" && (
          <div className="mb-8 rounded-xl border border-border-subtle bg-white p-6">
            <div className="flex items-center gap-3">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-accent border-t-transparent" />
              <div>
                <p className="text-sm font-medium text-foreground">
                  Running deep analysis...
                </p>
                <p className="text-xs text-text-muted">
                  Our AI is reviewing your site content and CRO effectiveness
                </p>
              </div>
            </div>
          </div>
        )}

        {aiAnalysis && (
          <div className="mb-8">
            <AiAnalysisCard analysis={aiAnalysis} />
          </div>
        )}

        {/* Business info form */}
        {phase === "audit_done" && (
          <div ref={formRef} className="mb-8">
            <BusinessInfoForm
              onSubmit={handleBusinessInfoSubmit}
              initialEmail={contactEmail ?? undefined}
              prefill={
                aiAnalysis
                  ? {
                      businessName: aiAnalysis.detectedBusinessName,
                      industry: aiAnalysis.detectedIndustry,
                      services: aiAnalysis.detectedServices,
                      locations: aiAnalysis.detectedLocations,
                    }
                  : undefined
              }
              disabled={
                aiAnalysisStatus !== null &&
                aiAnalysisStatus !== "complete" &&
                aiAnalysisStatus !== "failed"
              }
              disabledReason="Waiting for deep analysis..."
            />
          </div>
        )}

        {/* Generation progress */}
        {phase === "generating" && (
          <div className="mb-8">
            <ProgressBar
              currentStage={genStage}
              stages={GENERATION_STAGES}
              timeEstimate="Building your custom site... usually 2-5 minutes."
            />
            <p className="mt-2 text-center text-xs text-text-muted">
              Feel free to keep this tab open while we work.
            </p>
          </div>
        )}

        {/* Site preview */}
        {phase === "version_ready" && sitePreview && sitePreview.status === "ready" && (
          <div className="mb-8">
            <p className="mb-3 text-center text-sm text-text-muted">
              Here&apos;s your new website. Preview it, then go live.
            </p>

            {/* Inline iframe preview */}
            <div className="overflow-hidden rounded-xl border border-border-subtle bg-white shadow-sm">
              {/* Browser chrome bar */}
              <div className="flex items-center gap-2 border-b border-border-subtle bg-gray-50 px-4 py-2.5">
                <div className="flex gap-1.5">
                  <span className="h-3 w-3 rounded-full bg-red-400" />
                  <span className="h-3 w-3 rounded-full bg-yellow-400" />
                  <span className="h-3 w-3 rounded-full bg-green-400" />
                </div>
                <div className="mx-2 flex-1 truncate rounded-md bg-white px-3 py-1 text-xs text-text-muted border border-border-subtle">
                  {sitePreview.previewUrl}
                </div>
                <a
                  href={sitePreview.previewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 rounded-md p-1.5 text-text-muted transition-colors hover:bg-gray-200 hover:text-foreground"
                  title="Open in new tab"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </div>

              {/* iframe */}
              <div className="relative w-full" style={{ height: "70vh", minHeight: "480px" }}>
                <iframe
                  src={sitePreview.previewUrl}
                  title="Site preview"
                  className="absolute inset-0 h-full w-full"
                  sandbox="allow-scripts allow-same-origin"
                />
              </div>
            </div>

            {/* View Full Site button */}
            <div className="mt-4 flex justify-center">
              <a
                href={sitePreview.previewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl bg-accent px-6 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-accent-hover hover:shadow-lg hover:shadow-accent/25"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                View Full Site
              </a>
            </div>

            {/* Subscription includes */}
            <div className="mt-4 rounded-xl border border-border-subtle bg-white p-4">
              <h4 className="mb-2 text-sm font-semibold text-foreground">
                Your subscription includes
              </h4>
              <ul className="grid gap-1.5 sm:grid-cols-2">
                {SUBSCRIPTION_INCLUDES.map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm text-text-muted">
                    <svg className="h-3.5 w-3.5 shrink-0 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Floating CTA */}
      {phase === "version_ready" && sitePreview && sitePreview.status === "ready" && (
        <FloatingCTA
          onClick={handleGoLive}
          disabled={false}
        />
      )}
    </div>
  );
}
