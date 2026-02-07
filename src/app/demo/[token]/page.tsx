"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import ProgressBar from "@/components/ProgressBar";
import AuditResultCard from "@/components/AuditResultCard";
import FloatingCTA from "@/components/FloatingCTA";
import BusinessInfoForm from "@/components/BusinessInfoForm";
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

const POLL_INTERVAL_MS = 2_000;

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
  const [generationId, setGenerationId] = useState<string | null>(null);

  // ── Scroll to business form ─────────────────────────────────────────────
  const scrollToForm = useCallback(() => {
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, []);

  // ── Audit polling ──────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

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
            setPhase("error");
            return;
          }

          const data = json.data;

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

          if (data.isComplete) {
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
            return;
          }
        } catch {
          // Network error, keep trying
        }

        await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
      }
    }

    poll();

    return () => {
      cancelled = true;
    };
  }, [auditId]);

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
      services: string;
      locations: string;
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
              services: info.services.split(",").map((s) => s.trim()).filter(Boolean),
              locations: info.locations.split(",").map((s) => s.trim()).filter(Boolean),
              phone: null,
              contactEmail: info.contactEmail,
              targetKeywords: [],
            },
          }),
        });

        const data = await res.json();
        if (!res.ok || data.error) {
          setErrorMessage(data.error || "Failed to start generation");
          setPhase("error");
          return;
        }

        setGenerationId(data.data.generationId);
      } catch {
        setErrorMessage("Failed to start generation. Please try again.");
        setPhase("error");
      }
    },
    [auditId]
  );

  // ── Go live → checkout ──────────────────────────────────────────────
  const handleGoLive = () => {
    if (sitePreview) {
      router.push(`/checkout?auditId=${auditId}&version=${sitePreview.id}`);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-4xl px-4 py-8 pb-24">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
            {phase === "auditing" || phase === "audit_done"
              ? "Analyzing Your Website"
              : phase === "generating"
                ? "Building Your New Website"
                : phase === "version_ready"
                  ? "Your New Website Is Ready"
                  : "Website Refresh"}
          </h1>
          <p className="mt-2 text-gray-500">
            {phase === "auditing"
              ? "We're crawling your site and running a full audit..."
              : phase === "audit_done"
                ? "Audit complete! Tell us about your business to generate your new site."
                : phase === "generating"
                  ? "Creating a custom design tailored to your business..."
                  : phase === "version_ready"
                    ? "Preview your new site and go live in minutes."
                    : ""}
          </p>
        </div>

        {/* Error state */}
        {phase === "error" && (
          <div className="mb-8 rounded-lg border border-red-200 bg-red-50 p-6 text-center">
            <p className="font-medium text-red-800">
              {errorMessage || "Something went wrong"}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="mt-3 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
            >
              Try Again
            </button>
            <p className="mt-3 text-xs text-gray-500">
              Having trouble?{" "}
              <a href="mailto:support@smb-dm.com" className="text-blue-600 underline hover:text-blue-700">
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
            <p className="mt-2 text-center text-xs text-gray-400">
              Your data is analyzed securely and never shared.
            </p>
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

        {/* Business info form */}
        {phase === "audit_done" && (
          <div ref={formRef} className="mb-8">
            <BusinessInfoForm onSubmit={handleBusinessInfoSubmit} />
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
            <p className="mt-2 text-center text-xs text-gray-400">
              Feel free to keep this tab open while we work.
            </p>
          </div>
        )}

        {/* Site preview */}
        {phase === "version_ready" && sitePreview && sitePreview.status === "ready" && (
          <div className="mb-8">
            <p className="mb-3 text-center text-sm text-gray-600">
              Here&apos;s your new website. Preview it, then go live.
            </p>
            <div className="overflow-hidden rounded-lg border border-gray-200 shadow-sm">
              <div className="flex flex-col items-center gap-3 bg-white px-4 py-8">
                <a
                  href={sitePreview.previewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  Open Preview in New Tab
                </a>
                <span className="max-w-full truncate text-xs text-gray-400">
                  {sitePreview.previewUrl}
                </span>
              </div>
            </div>

            {/* Subscription includes */}
            <div className="mt-4 rounded-lg bg-gray-50 p-4">
              <h4 className="mb-2 text-sm font-semibold text-gray-900">
                Your subscription includes
              </h4>
              <ul className="grid gap-1.5 sm:grid-cols-2">
                {SUBSCRIPTION_INCLUDES.map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm text-gray-600">
                    <svg className="h-3.5 w-3.5 shrink-0 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
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
