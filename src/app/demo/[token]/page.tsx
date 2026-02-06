"use client";

import { useState, useEffect } from "react";
import ProgressBar from "@/components/ProgressBar";
import AuditResultCard from "@/components/AuditResultCard";
import VersionSwitcher from "@/components/VersionSwitcher";
import FloatingCTA from "@/components/FloatingCTA";
import EmailCaptureForm from "@/components/EmailCaptureForm";
import QRCode from "@/components/QRCode";
import { useParams, useRouter } from "next/navigation";

const STAGES = [
  { label: "Analyzing", description: "Crawling your website & SEO scan" },
  { label: "Mobile Check", description: "Checking mobile experience" },
  { label: "CTA Evaluation", description: "Evaluating calls-to-action" },
  { label: "Generating", description: "Generating your new websites" },
];

// Mock audit result
const MOCK_AUDIT = {
  seoScore: 42,
  mobileScore: 58,
  ctaCount: 2,
  hasAnalytics: false,
  targetUrl: "www.example-plumbing.com",
};

// Mock versions
const MOCK_VERSIONS = [
  {
    id: "v1",
    versionNumber: 1,
    previewUrl: "about:blank",
    designMeta: {
      colorPalette: ["#1e40af", "#3b82f6", "#dbeafe"],
      layoutType: "Modern Split",
      typography: "Inter",
    },
    status: "ready" as const,
  },
  {
    id: "v2",
    versionNumber: 2,
    previewUrl: "about:blank",
    designMeta: {
      colorPalette: ["#059669", "#34d399", "#d1fae5"],
      layoutType: "Classic Stack",
      typography: "Merriweather",
    },
    status: "ready" as const,
  },
  {
    id: "v3",
    versionNumber: 3,
    previewUrl: "about:blank",
    designMeta: {
      colorPalette: ["#7c3aed", "#a78bfa", "#ede9fe"],
      layoutType: "Bold Hero",
      typography: "Poppins",
    },
    status: "ready" as const,
  },
];

export default function DemoPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const [currentStage, setCurrentStage] = useState(0);
  const [showAudit, setShowAudit] = useState(false);
  const [showVersions, setShowVersions] = useState(false);
  const [showEmailCapture, setShowEmailCapture] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<string | null>(null);

  // Simulate the multi-stage audit + generation pipeline
  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];

    // Stage 0 -> 1: Analyzing (2s)
    timers.push(
      setTimeout(() => {
        setCurrentStage(1);
      }, 2000)
    );

    // Stage 1 -> 2: Mobile check (4s)
    timers.push(
      setTimeout(() => {
        setCurrentStage(2);
        setShowAudit(true); // Show audit results after first two stages
      }, 4000)
    );

    // Stage 2 -> 3: CTA evaluation (6s)
    timers.push(
      setTimeout(() => {
        setCurrentStage(3);
      }, 6000)
    );

    // Generation complete (10s)
    timers.push(
      setTimeout(() => {
        setCurrentStage(4);
        setShowVersions(true);
      }, 10000)
    );

    // Show email capture at 8s (simulating 60s fallback, compressed for demo)
    timers.push(
      setTimeout(() => {
        if (!showVersions) {
          setShowEmailCapture(true);
        }
      }, 8000)
    );

    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePickVersion = () => {
    if (selectedVersion) {
      router.push(`/checkout?token=${token}&version=${selectedVersion}`);
    }
  };

  const handleEmailCapture = (email: string) => {
    // Would call /api/onboarding/[token]/email-capture
    console.log("Email captured:", email);
  };

  const selectedVersionData = MOCK_VERSIONS.find(
    (v) => v.id === selectedVersion
  );

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-4xl px-4 py-8 pb-24">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
            Your Website Refresh
          </h1>
          <p className="mt-2 text-gray-500">
            We&apos;re analyzing your site and generating improved versions
          </p>
        </div>

        {/* Progress bar */}
        <div className="mb-8">
          <ProgressBar currentStage={currentStage} stages={STAGES} />
        </div>

        {/* Audit results */}
        {showAudit && (
          <div className="mb-8">
            <AuditResultCard {...MOCK_AUDIT} />
          </div>
        )}

        {/* Email capture fallback */}
        {showEmailCapture && !showVersions && (
          <div className="mb-8">
            <EmailCaptureForm onSubmit={handleEmailCapture} />
          </div>
        )}

        {/* Version switcher */}
        {showVersions && (
          <div className="mb-8">
            <h2 className="mb-4 text-xl font-semibold text-gray-900">
              Your New Website Options
            </h2>
            <VersionSwitcher
              versions={MOCK_VERSIONS}
              selectedVersion={selectedVersion}
              onSelect={setSelectedVersion}
            />
          </div>
        )}

        {/* QR code for live demo handoff */}
        {showVersions && (
          <div className="mt-8 flex flex-col items-center gap-4 rounded-lg border border-gray-200 bg-gray-50 p-6">
            <h3 className="text-sm font-medium text-gray-700">
              Continue on your phone
            </h3>
            <QRCode url={`https://platform.com/demo/${token}`} size={160} />
          </div>
        )}
      </div>

      {/* Floating CTA */}
      {showVersions && (
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
