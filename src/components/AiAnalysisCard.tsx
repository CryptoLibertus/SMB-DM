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

const SEVERITY_DOT: Record<Finding["severity"], string> = {
  critical: "bg-red-500",
  warning: "bg-yellow-500",
  info: "bg-accent/60",
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
  return GRADE_COLORS[letter] || "bg-text-muted";
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
  const [expandedFindings, setExpandedFindings] = useState<Set<string>>(
    () => new Set()
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

  const toggleFinding = (key: string) => {
    setExpandedFindings((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
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
    <div className="rounded-xl border border-border-subtle bg-white shadow-sm">
      {/* Header row: title + grade badge */}
      <div className="flex items-center justify-between px-6 py-4">
        <h3 className="text-lg font-semibold text-foreground">AI Analysis</h3>
        <div
          className={`flex h-12 w-12 items-center justify-center rounded-full ${getGradeColor(analysis.overallGrade)} text-lg font-bold text-white`}
        >
          {analysis.overallGrade}
        </div>
      </div>

      {/* Summary */}
      <div className="border-t border-border-subtle/50 px-6 py-3">
        <p className="text-sm text-text-muted">{analysis.summary}</p>
      </div>

      {/* Top Priorities */}
      <div className="border-t border-border-subtle/50 px-6 py-4">
        <h4 className="mb-2 text-sm font-semibold text-foreground">
          Top Priorities
        </h4>
        <ol className="space-y-1">
          {analysis.topPriorities.map((priority, i) => (
            <li key={i} className="flex gap-2 text-sm">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent/10 text-xs font-semibold text-accent">
                {i + 1}
              </span>
              <span className="font-medium text-foreground/80">{priority}</span>
            </li>
          ))}
        </ol>
      </div>

      {/* Findings by category */}
      <div className="border-t border-border-subtle/50">
        {CATEGORIES.map((category) => {
          const findings = findingsByCategory.get(category) || [];
          if (findings.length === 0) return null;

          const isExpanded = expandedCategories.has(category);

          return (
            <div key={category} className="border-b border-border-subtle/30 last:border-b-0">
              <button
                onClick={() => toggleCategory(category)}
                className="flex w-full items-center justify-between px-6 py-2.5 text-left transition-colors hover:bg-background"
              >
                <span className="text-sm font-medium text-foreground/80">
                  {category}{" "}
                  <span className="text-text-muted">({findings.length})</span>
                </span>
                <svg
                  className={`h-4 w-4 text-text-muted transition-transform ${isExpanded ? "rotate-180" : ""}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {isExpanded && (
                <ul className="px-6 pb-3 pt-0.5">
                  {findings.map((finding, i) => {
                    const findingKey = `${category}-${i}`;
                    const isDetailExpanded = expandedFindings.has(findingKey);

                    return (
                      <li key={i} className="py-0.5">
                        <button
                          type="button"
                          onClick={() => toggleFinding(findingKey)}
                          className="flex w-full items-start gap-2 text-left"
                        >
                          <span
                            className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${SEVERITY_DOT[finding.severity]}`}
                          />
                          <span className="text-sm font-medium text-foreground/80">
                            {finding.title}
                          </span>
                        </button>
                        {isDetailExpanded && (
                          <div className="ml-4 mt-1 mb-2 rounded border-l-2 border-border-subtle pl-3">
                            <p className="text-xs leading-relaxed text-text-muted">
                              {finding.detail}
                            </p>
                            <p className="mt-1 text-xs text-accent">
                              <span className="font-medium">Fix:</span>{" "}
                              {finding.recommendation}
                            </p>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
