"use client";

import Link from "next/link";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

function SuccessContent() {
  // Read search params so the component is compatible with session_id if passed
  useSearchParams();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md text-center">
        <div className="rounded-lg border border-border-subtle bg-white p-8 shadow-sm">
          {/* Green checkmark */}
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <svg
              className="h-8 w-8 text-green-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>

          <h1 className="mb-2 text-2xl font-bold text-foreground">
            You&apos;re all set!
          </h1>
          <p className="mb-8 text-sm text-text-muted">
            Your subscription is active. Here&apos;s what happens next:
          </p>

          {/* Next steps */}
          <ol className="mb-8 space-y-4 text-left">
            <li className="flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/10 text-xs font-bold text-accent">
                1
              </span>
              <p className="text-sm text-foreground">
                We&apos;re deploying your website now (~2 minutes)
              </p>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/10 text-xs font-bold text-accent">
                2
              </span>
              <p className="text-sm text-foreground">
                Check your email for a welcome message with dashboard login
              </p>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/10 text-xs font-bold text-accent">
                3
              </span>
              <p className="text-sm text-foreground">
                Set up your custom domain from the dashboard
              </p>
            </li>
          </ol>

          {/* CTA button */}
          <Link
            href="/dashboard"
            className="inline-flex w-full items-center justify-center rounded-lg bg-accent px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
          >
            Go to Dashboard
            <svg
              className="ml-1.5 h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </Link>

          <p className="mt-6 text-xs text-text-light">
            Need help?{" "}
            <a
              href="mailto:support@smb-dm.com"
              className="text-accent hover:underline"
            >
              Email support@smb-dm.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <p className="text-text-muted">Loading...</p>
        </div>
      }
    >
      <SuccessContent />
    </Suspense>
  );
}
