"use client";

import { useState } from "react";

interface FloatingCTAProps {
  onClick: () => void;
  disabled?: boolean;
  onDismiss?: () => void;
}

export default function FloatingCTA({
  onClick,
  disabled = false,
  onDismiss,
}: FloatingCTAProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 bg-white/95 px-4 py-3 backdrop-blur-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-center gap-4">
        <span className="hidden text-sm text-gray-500 sm:inline">
          $99.95/mo &middot; Cancel anytime
        </span>
        <button
          onClick={onClick}
          disabled={disabled}
          className="rounded-lg bg-blue-600 px-8 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Go Live Now
        </button>
      </div>
      <button
        onClick={() => {
          setDismissed(true);
          onDismiss?.();
        }}
        className="absolute right-3 top-2 p-1 text-gray-400 hover:text-gray-600"
        aria-label="Dismiss"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
