"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import ProgressBar from "@/components/ProgressBar";
import AuditResultCard from "@/components/AuditResultCard";
import AiAnalysisCard from "@/components/AiAnalysisCard";
import BusinessInfoForm from "@/components/BusinessInfoForm";
import WizardShell from "@/components/WizardShell";
import RotatingTips from "@/components/RotatingTips";
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

const AUDIT_TIPS = [
  "53% of mobile users leave slow sites within 3 seconds.",
  "SEO drives 68% of all web traffic for small businesses.",
  "Websites with clear CTAs convert 3x more visitors.",
  "75% of consumers judge credibility by website design.",
  "Local SEO helps 46% of all Google searches find nearby businesses.",
];

const GENERATION_TIPS = [
  "Your site includes SEO-optimized meta tags and headings.",
  "Building mobile-first responsive layouts for all devices.",
  "Adding strategic calls-to-action to convert visitors into leads.",
  "Optimizing page speed for better search rankings.",
  "Creating professional, conversion-focused design sections.",
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
const MIN_AUDIT_DISPLAY_MS = 4_000;

const SUBSCRIPTION_INCLUDES = [
  "Managed hosting & daily backups",
  "2 SEO blog posts per week",
  "Built-in analytics dashboard",
  "Custom domain with free SSL",
];

// ── Step config ─────────────────────────────────────────────────────────────
const STEP_CONFIG: Record<number, { title: string; subtitle: string }> = {
  1: {
    title: "Analyzing Your Website",
    subtitle: "We\u2019re crawling your site and running a full audit...",
  },
  2: {
    title: "Your Audit Results",
    subtitle: "Here\u2019s what we found. Review your scores, then customize your new site.",
  },
  3: {
    title: "Tell Us About Your Business",
    subtitle: "Takes about 30 seconds. We\u2019ll build a site matched to your brand.",
  },
  4: {
    title: "Building Your New Website",
    subtitle: "Creating a custom design tailored to your business...",
  },
  5: {
    title: "Your New Website Is Ready",
    subtitle: "Preview your new site and go live in minutes.",
  },
};

const TOTAL_STEPS = 5;

export default function DemoPage() {
  const params = useParams();
  const router = useRouter();
  const auditId = params.token as string;
  const scrollRef = useRef<HTMLDivElement>(null);

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

  // ── Wizard state ──────────────────────────────────────────────────────
  const [wizardStep, setWizardStep] = useState(1);
  const [direction, setDirection] = useState<1 | -1>(1);

  // Sync wizard step from phase changes (auto-advancing steps)
  useEffect(() => {
    if (phase === "auditing" && wizardStep !== 1) {
      setDirection(wizardStep > 1 ? -1 : 1);
      setWizardStep(1);
    } else if (phase === "audit_done" && wizardStep < 2) {
      setDirection(1);
      setWizardStep(2);
    } else if (phase === "generating" && wizardStep !== 4) {
      setDirection(1);
      setWizardStep(4);
    } else if (phase === "version_ready" && wizardStep !== 5) {
      setDirection(1);
      setWizardStep(5);
    }
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  // Scroll step content to top on step change
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [wizardStep]);

  const goToStep = (step: number) => {
    setDirection(step > wizardStep ? 1 : -1);
    setWizardStep(step);
  };

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

          if (data.aiAnalysisStatus) {
            setAiAnalysisStatus(data.aiAnalysisStatus);
          }
          if (data.aiAnalysis) {
            setAiAnalysis(data.aiAnalysis);
          }

          if (data.isComplete) {
            if (!basicAuditDone) {
              const elapsed = Date.now() - mountedAt;
              if (elapsed < MIN_AUDIT_DISPLAY_MS) {
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

            const aiStatus = data.aiAnalysisStatus;
            if (aiStatus === "pending" || aiStatus === "analyzing") {
              // Keep polling for AI analysis
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

  // ── Error overlay ─────────────────────────────────────────────────────
  if (phase === "error") {
    return (
      <WizardShell
        currentStep={wizardStep}
        totalSteps={TOTAL_STEPS}
        title="Something Went Wrong"
        subtitle={errorMessage || "An unexpected error occurred."}
        direction={direction}
      >
        <div className="flex flex-1 items-center justify-center px-6 py-12">
          <div className="w-full max-w-md rounded-xl border border-red-300/30 bg-red-50 p-6 text-center">
            <p className="font-medium text-red-800">
              {errorMessage || "Something went wrong"}
            </p>
            <button
              onClick={() => {
                setErrorMessage(null);
                if (errorSource === "generation") {
                  setGenerationId(null);
                  setSitePreview(null);
                  setGenStage(0);
                  setPhase("audit_done");
                } else {
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
        </div>
      </WizardShell>
    );
  }

  // ── Get step title/subtitle ────────────────────────────────────────────
  const stepConfig = STEP_CONFIG[wizardStep] ?? STEP_CONFIG[1];

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <WizardShell
      currentStep={wizardStep}
      totalSteps={TOTAL_STEPS}
      title={stepConfig.title}
      subtitle={stepConfig.subtitle}
      direction={direction}
    >
      <div ref={scrollRef} className="flex flex-1 flex-col overflow-y-auto">
        {/* ── Step 1: Analyzing ── */}
        {wizardStep === 1 && (
          <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center px-6 py-12">
            <div className="w-full">
              <ProgressBar
                currentStage={auditStage}
                stages={AUDIT_STAGES}
                timeEstimate="This usually takes about 60 seconds..."
              />
            </div>

            <div className="mt-8 w-full">
              <RotatingTips tips={AUDIT_TIPS} />
            </div>

            <p className="mt-4 text-center text-xs text-text-muted">
              Your data is analyzed securely and never shared.
            </p>

            {/* Skeleton card */}
            <div className="mt-8 w-full animate-pulse rounded-xl border border-border-subtle bg-white p-6">
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

        {/* ── Step 2: Audit Results ── */}
        {wizardStep === 2 && (
          <div className="mx-auto w-full max-w-4xl px-4 py-8 pb-28 sm:px-6">
            {auditResult && auditResult.seoScore > 0 && (
              <div className="mb-6">
                <AuditResultCard
                  seoScore={auditResult.seoScore}
                  mobileScore={auditResult.mobileScore}
                  ctaCount={auditResult.ctaCount}
                  hasAnalytics={auditResult.hasAnalytics}
                  targetUrl={auditResult.targetUrl}
                  metaTags={auditResult.metaTags}
                  analyticsDetected={auditResult.analyticsDetected}
                />
              </div>
            )}

            {/* AI Analysis loading */}
            {aiAnalysisStatus && !aiAnalysis && aiAnalysisStatus !== "failed" && (
              <div className="mb-6 rounded-xl border border-border-subtle bg-white p-6">
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
              <div className="mb-6">
                <AiAnalysisCard analysis={aiAnalysis} />
              </div>
            )}

            {/* Sticky bottom bar */}
            <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border-subtle bg-white/95 px-4 py-3 backdrop-blur-sm">
              <div className="mx-auto flex max-w-4xl items-center justify-between">
                <button
                  onClick={() => goToStep(1)}
                  className="text-sm text-text-muted transition-colors hover:text-foreground"
                >
                  &larr; Back
                </button>
                <button
                  onClick={() => goToStep(3)}
                  className="rounded-xl bg-accent px-6 py-2.5 text-sm font-semibold text-white transition-all hover:bg-accent-hover hover:shadow-lg hover:shadow-accent/25 active:scale-[0.98]"
                >
                  Next: Customize Your Site &rarr;
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Step 3: Business Info Form ── */}
        {wizardStep === 3 && (
          <div className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center px-4 py-8 sm:px-6">
            <button
              onClick={() => goToStep(2)}
              className="mb-4 self-start text-sm text-text-muted transition-colors hover:text-foreground"
            >
              &larr; Back to Results
            </button>

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

        {/* ── Step 4: Generating ── */}
        {wizardStep === 4 && (
          <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center px-6 py-12">
            <div className="w-full">
              <ProgressBar
                currentStage={genStage}
                stages={GENERATION_STAGES}
                timeEstimate="Building your custom site... usually 2\u20135 minutes."
              />
            </div>

            <div className="mt-8 w-full">
              <RotatingTips tips={GENERATION_TIPS} intervalMs={5000} />
            </div>

            <p className="mt-4 text-center text-xs text-text-muted">
              Feel free to keep this tab open while we work.
            </p>
          </div>
        )}

        {/* ── Step 5: Preview + Go Live ── */}
        {wizardStep === 5 && sitePreview && sitePreview.status === "ready" && (
          <div className="mx-auto w-full max-w-4xl px-4 py-8 pb-28 sm:px-6">
            {/* Iframe preview */}
            <div className="overflow-hidden rounded-xl border border-border-subtle bg-white shadow-sm">
              {/* Browser chrome bar */}
              <div className="flex items-center gap-2 border-b border-border-subtle bg-gray-50 px-4 py-2.5">
                <div className="flex gap-1.5">
                  <span className="h-3 w-3 rounded-full bg-red-400" />
                  <span className="h-3 w-3 rounded-full bg-yellow-400" />
                  <span className="h-3 w-3 rounded-full bg-green-400" />
                </div>
                <div className="mx-2 flex-1 truncate rounded-md border border-border-subtle bg-white px-3 py-1 text-xs text-text-muted">
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
              <div className="relative w-full" style={{ height: "60vh", minHeight: "400px" }}>
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
                className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-accent border border-border-subtle shadow-sm transition-all hover:shadow-md"
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

            {/* Sticky bottom CTA */}
            <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border-subtle bg-white/95 px-4 py-3 backdrop-blur-sm">
              <div className="mx-auto flex max-w-4xl items-center justify-center gap-4">
                <span className="hidden text-sm text-text-muted sm:inline">
                  $99.95/mo &middot; Cancel anytime
                </span>
                <button
                  onClick={handleGoLive}
                  className="rounded-xl bg-accent px-8 py-2.5 text-sm font-semibold text-white transition-all hover:bg-accent-hover hover:shadow-lg hover:shadow-accent/25 active:scale-[0.98]"
                >
                  Go Live Now &mdash; $99.95/mo
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </WizardShell>
  );
}
