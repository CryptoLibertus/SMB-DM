"use client";

interface FloatingCTAProps {
  onClick: () => void;
  disabled?: boolean;
}

export default function FloatingCTA({
  onClick,
  disabled = false,
}: FloatingCTAProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 bg-white/95 px-4 py-3 backdrop-blur-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-center">
        <button
          onClick={onClick}
          disabled={disabled}
          className="rounded-lg bg-blue-600 px-8 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Go Live - Subscribe Now
        </button>
      </div>
    </div>
  );
}
