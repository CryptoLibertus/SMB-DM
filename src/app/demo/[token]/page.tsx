"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import ProgressBar from "@/components/ProgressBar";
import AuditResultCard from "@/components/AuditResultCard";
import VersionSwitcher from "@/components/VersionSwitcher";
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
  { label: "Preparing", description: "Setting up generation" },
  { label: "Version 1", description: "Modern & Bold" },
  { label: "Version 2", description: "Clean & Professional" },
  { label: "Version 3", description: "Warm & Friendly" },
];

// ── Types matching the SSE events ───────────────────────────────────────────
interface AuditResult {
  seoScore: number;
  mobileScore: number;
  ctaCount: number;
  hasAnalytics: boolean;
  targetUrl: string;
}

interface Version {
  id: string;
  versionNumber: number;
  previewUrl: string;
  designMeta: {
    colorPalette: string[];
    layoutType: string;
    typography: string;
  };
  status: "generating" | "ready" | "failed";
}

type Phase = "auditing" | "audit_done" | "generating" | "versions_ready" | "error";

export default function DemoPage() {
  const params = useParams();
  const router = useRouter();
  const auditId = params.token as string;

  // ── State ──────────────────────────────────────────────────────────────
  const [phase, setPhase] = useState<Phase>("auditing");
  const [auditStage, setAuditStage] = useState(0);
  const [genStage, setGenStage] = useState(0);
  const [auditResult, setAuditResult] = useState<AuditResult | null>(null);
  const [versions, setVersions] = useState<Version[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [generationId, setGenerationId] = useState<string | null>(null);
  const [targetUrl, setTargetUrl] = useState<string>("");

  const auditEventSourceRef = useRef<EventSource | null>(null);
  const genEventSourceRef = useRef<EventSource | null>(null);

  // ── Audit SSE ──────────────────────────────────────────────────────────
  useEffect(() => {
    const es = new EventSource(`/api/audit/${auditId}/status`);
    auditEventSourceRef.current = es;

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        // Track URL from first event
        if (data.auditId) {
          setTargetUrl((prev) => prev || data.auditId);
        }

        // Map stage number to progress
        if (typeof data.stage === "number") {
          setAuditStage(data.stage);
        }

        // Extract partial results as they arrive
        if (data.partialResults) {
          const p = data.partialResults;
          setAuditResult((prev) => ({
            seoScore: p.seoScore ?? prev?.seoScore ?? 0,
            mobileScore: p.mobileScore ?? prev?.mobileScore ?? 0,
            ctaCount: p.ctaAnalysis?.elements?.length ?? prev?.ctaCount ?? 0,
            hasAnalytics: p.analyticsDetected
              ? p.analyticsDetected.ga4 || p.analyticsDetected.gtm
              : prev?.hasAnalytics ?? false,
            targetUrl: p.targetUrl ?? prev?.targetUrl ?? "",
          }));
        }

        // Check for completion or error
        if (data.stageName === "complete") {
          setPhase("audit_done");
          es.close();
        } else if (data.stageName === "error") {
          setErrorMessage(data.message || "Audit failed");
          setPhase("error");
          es.close();
        }
      } catch {
        // ignore parse errors
      }
    };

    es.onerror = () => {
      // EventSource will auto-reconnect; if it fails, show error
      setTimeout(() => {
        if (es.readyState === EventSource.CLOSED) {
          // Only error if we haven't already moved past auditing
          setPhase((current) => {
            if (current === "auditing") return "error";
            return current;
          });
          setErrorMessage("Lost connection to audit. Please refresh.");
        }
      }, 5000);
    };

    return () => {
      es.close();
    };
  }, [auditId]);

  // ── Generation SSE ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!generationId) return;

    const es = new EventSource(`/api/generate/${generationId}/status`);
    genEventSourceRef.current = es;

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        // Map generation stages to progress
        if (data.stage === "initializing") setGenStage(0);
        else if (data.stage === "generating_v1") setGenStage(1);
        else if (data.stage === "generating_v2") setGenStage(2);
        else if (data.stage === "generating_v3") setGenStage(3);

        // Update version status when a version completes
        if (data.versionNumber && data.versionStatus) {
          setVersions((prev) => {
            const existing = prev.find(
              (v) => v.versionNumber === data.versionNumber
            );
            if (existing) {
              return prev.map((v) =>
                v.versionNumber === data.versionNumber
                  ? {
                      ...v,
                      status: data.versionStatus,
                      previewUrl: data.previewUrl || v.previewUrl,
                    }
                  : v
              );
            }
            // New version appeared
            if (data.versionStatus === "ready" || data.versionStatus === "generating") {
              return [
                ...prev,
                {
                  id: `v${data.versionNumber}`,
                  versionNumber: data.versionNumber,
                  previewUrl: data.previewUrl || "about:blank",
                  designMeta: getDesignMeta(data.versionNumber),
                  status: data.versionStatus,
                },
              ];
            }
            return prev;
          });
        }

        // Check for completion
        if (data.stage === "complete") {
          setPhase("versions_ready");
          es.close();
        } else if (data.stage === "error") {
          setErrorMessage(data.message || "Generation failed");
          setPhase("error");
          es.close();
        }
      } catch {
        // ignore parse errors
      }
    };

    es.onerror = () => {
      setTimeout(() => {
        if (es.readyState === EventSource.CLOSED) {
          setPhase((current) => {
            if (current === "generating") return "error";
            return current;
          });
          setErrorMessage("Lost connection to generator. Please refresh.");
        }
      }, 5000);
    };

    return () => {
      es.close();
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

      // Initialize version placeholders
      setVersions([
        { id: "v1", versionNumber: 1, previewUrl: "about:blank", designMeta: getDesignMeta(1), status: "generating" },
        { id: "v2", versionNumber: 2, previewUrl: "about:blank", designMeta: getDesignMeta(2), status: "generating" },
        { id: "v3", versionNumber: 3, previewUrl: "about:blank", designMeta: getDesignMeta(3), status: "generating" },
      ]);

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
        if (!res.ok || !data.success) {
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

  // ── Choose version → checkout ──────────────────────────────────────────
  const handlePickVersion = () => {
    if (selectedVersion) {
      router.push(`/checkout?auditId=${auditId}&version=${selectedVersion}`);
    }
  };

  const selectedVersionData = versions.find((v) => v.id === selectedVersion);

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
                ? "Generating Your New Websites"
                : phase === "versions_ready"
                  ? "Your New Website Options"
                  : "Website Refresh"}
          </h1>
          <p className="mt-2 text-gray-500">
            {phase === "auditing"
              ? "We're crawling your site and running a full audit..."
              : phase === "audit_done"
                ? "Audit complete! Tell us about your business to generate your new sites."
                : phase === "generating"
                  ? "Creating 3 unique designs tailored to your business..."
                  : phase === "versions_ready"
                    ? "Pick your favorite design and go live in minutes."
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
          </div>
        )}

        {/* Audit progress */}
        {phase === "auditing" && (
          <div className="mb-8">
            <ProgressBar currentStage={auditStage} stages={AUDIT_STAGES} />
          </div>
        )}

        {/* Audit results (shown once available, persists through all later phases) */}
        {auditResult && auditResult.seoScore > 0 && (
          <div className="mb-8">
            <AuditResultCard
              seoScore={auditResult.seoScore}
              mobileScore={auditResult.mobileScore}
              ctaCount={auditResult.ctaCount}
              hasAnalytics={auditResult.hasAnalytics}
              targetUrl={auditResult.targetUrl || targetUrl}
            />
          </div>
        )}

        {/* Business info form (shown after audit completes) */}
        {phase === "audit_done" && (
          <div className="mb-8">
            <BusinessInfoForm onSubmit={handleBusinessInfoSubmit} />
          </div>
        )}

        {/* Generation progress */}
        {phase === "generating" && (
          <div className="mb-8">
            <ProgressBar currentStage={genStage} stages={GENERATION_STAGES} />
          </div>
        )}

        {/* Version switcher */}
        {(phase === "generating" || phase === "versions_ready") &&
          versions.length > 0 && (
            <div className="mb-8">
              <VersionSwitcher
                versions={versions}
                selectedVersion={selectedVersion}
                onSelect={setSelectedVersion}
              />
            </div>
          )}
      </div>

      {/* Floating CTA */}
      {phase === "versions_ready" && (
        <FloatingCTA
          versionLabel={
            selectedVersionData
              ? `Version ${selectedVersionData.versionNumber}`
              : undefined
          }
          onClick={handlePickVersion}
          disabled={!selectedVersion}
        />
      )}
    </div>
  );
}

// ── Helper: default design meta per version number ──────────────────────────
function getDesignMeta(versionNumber: number) {
  const directives = [
    {
      colorPalette: ["#0F172A", "#3B82F6", "#F8FAFC", "#EAB308", "#1E293B"],
      layoutType: "Modern & Bold",
      typography: "Inter",
    },
    {
      colorPalette: ["#FFFFFF", "#1E3A5F", "#F1F5F9", "#0EA5E9", "#334155"],
      layoutType: "Clean & Professional",
      typography: "Source Sans Pro",
    },
    {
      colorPalette: ["#FFF7ED", "#EA580C", "#FAFAF9", "#16A34A", "#78350F"],
      layoutType: "Warm & Friendly",
      typography: "Nunito",
    },
  ];
  return directives[versionNumber - 1] || directives[0];
}
