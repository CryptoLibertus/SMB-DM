"use client";

interface FloatingCTAProps {
  versionLabel?: string;
  onClick: () => void;
  disabled?: boolean;
}

export default function FloatingCTA({
  versionLabel,
  onClick,
  disabled = false,
}: FloatingCTAProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 bg-white/95 px-4 py-3 backdrop-blur-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
        {versionLabel && (
          <p className="text-sm text-gray-600">
            Selected: <span className="font-medium text-gray-900">{versionLabel}</span>
          </p>
        )}
        <button
          onClick={onClick}
          disabled={disabled}
          className="ml-auto rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Pick this one
        </button>
      </div>
    </div>
  );
}
