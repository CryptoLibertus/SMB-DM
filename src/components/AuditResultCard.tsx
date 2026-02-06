"use client";

interface AuditResultCardProps {
  seoScore: number;
  mobileScore: number;
  ctaCount: number;
  hasAnalytics: boolean;
  targetUrl: string;
}

function ScoreCircle({
  score,
  label,
}: {
  score: number;
  label: string;
}) {
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color =
    score >= 80 ? "text-green-500" : score >= 50 ? "text-yellow-500" : "text-red-500";
  const strokeColor =
    score >= 80 ? "#22c55e" : score >= 50 ? "#eab308" : "#ef4444";

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative h-24 w-24">
        <svg className="h-full w-full -rotate-90" viewBox="0 0 80 80">
          <circle
            cx="40"
            cy="40"
            r={radius}
            fill="none"
            stroke="#e5e7eb"
            strokeWidth="6"
          />
          <circle
            cx="40"
            cy="40"
            r={radius}
            fill="none"
            stroke={strokeColor}
            strokeWidth="6"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`text-xl font-bold ${color}`}>{score}</span>
        </div>
      </div>
      <span className="text-xs font-medium text-gray-600">{label}</span>
    </div>
  );
}

export default function AuditResultCard({
  seoScore,
  mobileScore,
  ctaCount,
  hasAnalytics,
  targetUrl,
}: AuditResultCardProps) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Audit Results</h3>
        <p className="text-sm text-gray-500">{targetUrl}</p>
      </div>

      <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
        <ScoreCircle score={seoScore} label="SEO Score" />
        <ScoreCircle score={mobileScore} label="Mobile Score" />

        <div className="flex flex-col items-center gap-2">
          <div className="flex h-24 w-24 items-center justify-center rounded-full border-[6px] border-gray-200">
            <span className="text-xl font-bold text-gray-900">{ctaCount}</span>
          </div>
          <span className="text-xs font-medium text-gray-600">CTAs Found</span>
        </div>

        <div className="flex flex-col items-center gap-2">
          <div
            className={`flex h-24 w-24 items-center justify-center rounded-full border-[6px] ${
              hasAnalytics ? "border-green-500" : "border-red-500"
            }`}
          >
            {hasAnalytics ? (
              <svg className="h-8 w-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
          </div>
          <span className="text-xs font-medium text-gray-600">Analytics</span>
        </div>
      </div>
    </div>
  );
}
