"use client";

import { useState, useEffect } from "react";

interface FloatingCTAProps {
  onClick: () => void;
  disabled?: boolean;
}

const REAPPEAR_DELAY_MS = 10_000;

export default function FloatingCTA({
  onClick,
  disabled = false,
}: FloatingCTAProps) {
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!dismissed) return;

    const timer = setTimeout(() => {
      setDismissed(false);
    }, REAPPEAR_DELAY_MS);

    return () => clearTimeout(timer);
  }, [dismissed]);

  if (dismissed) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border-subtle bg-white/95 px-4 py-3 backdrop-blur-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-center gap-4">
        <span className="hidden text-sm text-text-muted sm:inline">
          $99.95/mo &middot; Cancel anytime
        </span>
        <button
          onClick={onClick}
          disabled={disabled}
          className="rounded-xl bg-accent px-8 py-2.5 text-sm font-semibold text-white transition-all hover:bg-accent-hover hover:shadow-lg hover:shadow-accent/25 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
        >
          Go Live Now
        </button>
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="absolute right-3 top-2 p-1 text-text-muted hover:text-foreground"
        aria-label="Dismiss"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
