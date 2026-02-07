"use client";

import { useState } from "react";
import Link from "next/link";

interface ChecklistItem {
  id: string;
  label: string;
  description: string;
  href?: string;
  completed: boolean;
}

const CHECKLIST_ITEMS: ChecklistItem[] = [
  {
    id: "reviewed_site",
    label: "Review your generated site",
    description: "Preview your new website and make sure everything looks good.",
    completed: false,
  },
  {
    id: "connected_domain",
    label: "Connect your custom domain",
    description: "Point your domain to SMB-DM for a professional web presence.",
    href: "/dashboard/settings",
    completed: false,
  },
  {
    id: "verified_dns",
    label: "Verify DNS configuration",
    description: "Confirm your domain's DNS records are set up correctly.",
    href: "/dashboard/settings",
    completed: false,
  },
  {
    id: "submitted_change",
    label: "Submit your first change request",
    description: "Try updating something on your site — you get 5 per month.",
    href: "/dashboard/changes/new",
    completed: false,
  },
];

export default function OnboardingChecklist() {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const completedCount = CHECKLIST_ITEMS.filter((i) => i.completed).length;
  const totalCount = CHECKLIST_ITEMS.length;
  const progressPercent = Math.round((completedCount / totalCount) * 100);

  return (
    <div className="mb-6 rounded-xl border border-accent/20 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            Get started with your new site
          </h2>
          <p className="mt-1 text-sm text-text-muted">
            Complete these steps to make the most of your subscription.
          </p>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="shrink-0 rounded-md p-1 text-text-light transition-colors hover:bg-background hover:text-text-muted"
          aria-label="Dismiss checklist"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Progress bar */}
      <div className="mt-4">
        <div className="flex items-center justify-between text-xs text-text-muted">
          <span>{completedCount} of {totalCount} complete</span>
          <span>{progressPercent}%</span>
        </div>
        <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-background">
          <div
            className="h-full rounded-full bg-accent transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Checklist items */}
      <ul className="mt-5 space-y-3">
        {CHECKLIST_ITEMS.map((item) => (
          <li key={item.id} className="flex items-start gap-3">
            <div
              className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                item.completed
                  ? "border-green-500 bg-green-500"
                  : "border-border-subtle bg-white"
              }`}
            >
              {item.completed && (
                <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p
                  className={`text-sm font-medium ${
                    item.completed ? "text-text-light line-through" : "text-foreground"
                  }`}
                >
                  {item.label}
                </p>
                {item.href && !item.completed && (
                  <Link
                    href={item.href}
                    className="text-xs font-medium text-accent hover:text-accent-hover"
                  >
                    Go &rarr;
                  </Link>
                )}
              </div>
              <p className="text-xs text-text-muted">{item.description}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
