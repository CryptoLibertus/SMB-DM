"use client";

import { useState } from "react";

interface Finding {
  category: string;
  severity: "critical" | "warning" | "info";
  title: string;
  detail: string;
  recommendation: string;
}

interface AiAnalysis {
  summary: string;
  overallGrade: string;
  findings: Finding[];
  topPriorities: string[];
}

const SEVERITY_STYLES: Record<
  Finding["severity"],
  { bg: string; text: string; label: string }
> = {
  critical: { bg: "bg-red-100", text: "text-red-800", label: "Critical" },
  warning: { bg: "bg-yellow-100", text: "text-yellow-800", label: "Warning" },
  info: { bg: "bg-blue-100", text: "text-blue-800", label: "Info" },
};

const GRADE_COLORS: Record<string, string> = {
  A: "bg-green-600",
  B: "bg-green-500",
  C: "bg-yellow-500",
  D: "bg-orange-500",
  F: "bg-red-600",
};

function getGradeColor(grade: string): string {
  const letter = grade.charAt(0).toUpperCase();
  return GRADE_COLORS[letter] || "bg-gray-500";
}

const CATEGORIES = [
  "Copy & Messaging",
  "Visual Design",
  "Conversion",
  "Technical SEO",
  "Trust & Credibility",
];

export default function AiAnalysisCard({
  analysis,
}: {
  analysis: AiAnalysis;
}) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    () => new Set(CATEGORIES)
  );

  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  // Group findings by category
  const findingsByCategory = new Map<string, Finding[]>();
  for (const cat of CATEGORIES) {
    findingsByCategory.set(cat, []);
  }
  for (const finding of analysis.findings) {
    const existing = findingsByCategory.get(finding.category);
    if (existing) {
      existing.push(finding);
    } else {
      findingsByCategory.set(finding.category, [finding]);
    }
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
      {/* Header with grade */}
      <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            AI Deep Analysis
          </h3>
          <p className="mt-0.5 text-sm text-gray-500">
            CRO expert assessment of your website
          </p>
        </div>
        <div
          className={`flex h-14 w-14 items-center justify-center rounded-full ${getGradeColor(analysis.overallGrade)} text-xl font-bold text-white`}
        >
          {analysis.overallGrade}
        </div>
      </div>

      {/* Executive summary */}
      <div className="border-b border-gray-100 px-6 py-4">
        <p className="text-sm leading-relaxed text-gray-700">
          {analysis.summary}
        </p>
      </div>

      {/* Top priorities */}
      <div className="border-b border-gray-100 px-6 py-4">
        <h4 className="mb-2 text-sm font-semibold text-gray-900">
          Top Priorities
        </h4>
        <ol className="space-y-1.5">
          {analysis.topPriorities.map((priority, i) => (
            <li key={i} className="flex gap-2 text-sm text-gray-700">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-700">
                {i + 1}
              </span>
              <span className="font-medium">{priority}</span>
            </li>
          ))}
        </ol>
      </div>

      {/* Findings by category */}
      <div className="divide-y divide-gray-100">
        {CATEGORIES.map((category) => {
          const findings = findingsByCategory.get(category) || [];
          if (findings.length === 0) return null;

          const isExpanded = expandedCategories.has(category);
          const criticalCount = findings.filter(
            (f) => f.severity === "critical"
          ).length;
          const warningCount = findings.filter(
            (f) => f.severity === "warning"
          ).length;

          return (
            <div key={category}>
              <button
                onClick={() => toggleCategory(category)}
                className="flex w-full items-center justify-between px-6 py-3 text-left hover:bg-gray-50"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-gray-900">
                    {category}
                  </span>
                  <span className="text-xs text-gray-400">
                    ({findings.length})
                  </span>
                  {criticalCount > 0 && (
                    <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-xs font-medium text-red-700">
                      {criticalCount} critical
                    </span>
                  )}
                  {warningCount > 0 && (
                    <span className="rounded-full bg-yellow-100 px-1.5 py-0.5 text-xs font-medium text-yellow-700">
                      {warningCount} warning
                    </span>
                  )}
                </div>
                <svg
                  className={`h-4 w-4 text-gray-400 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>

              {isExpanded && (
                <div className="space-y-3 px-6 pb-4">
                  {findings.map((finding, i) => {
                    const severity = SEVERITY_STYLES[finding.severity];
                    return (
                      <div
                        key={i}
                        className="rounded-lg border border-gray-100 bg-gray-50 p-4"
                      >
                        <div className="mb-1.5 flex items-center gap-2">
                          <span
                            className={`rounded px-1.5 py-0.5 text-xs font-medium ${severity.bg} ${severity.text}`}
                          >
                            {severity.label}
                          </span>
                          <span className="text-sm font-semibold text-gray-900">
                            {finding.title}
                          </span>
                        </div>
                        <p className="mb-2 text-sm leading-relaxed text-gray-600">
                          {finding.detail}
                        </p>
                        <div className="rounded border-l-2 border-blue-300 bg-blue-50 py-1.5 pl-3 pr-2">
                          <p className="text-sm text-blue-800">
                            <span className="font-medium">Recommendation:</span>{" "}
                            {finding.recommendation}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
