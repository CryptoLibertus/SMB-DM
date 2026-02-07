"use client";

interface AuditResultCardProps {
  seoScore: number;
  mobileScore: number;
  ctaCount: number;
  hasAnalytics: boolean;
  targetUrl: string;
  metaTags?: {
    title: string | null;
    description: string | null;
    h1s: string[];
    robots: string | null;
  };
  analyticsDetected?: { ga4: boolean; gtm: boolean; other: string[] };
  onGenerateClick?: () => void;
}

function getSeverity(score: number): "red" | "yellow" | "green" {
  if (score >= 80) return "green";
  if (score >= 50) return "yellow";
  return "red";
}

const severityStyles = {
  red: "border-red-400 bg-red-50",
  yellow: "border-yellow-400 bg-yellow-50",
  green: "border-green-400 bg-green-50",
} as const;

const severityBadge = {
  red: "bg-red-100 text-red-700",
  yellow: "bg-yellow-100 text-yellow-700",
  green: "bg-green-100 text-green-700",
} as const;

function buildSeoInsight(
  score: number,
  metaTags?: AuditResultCardProps["metaTags"]
) {
  const issues: string[] = [];
  if (metaTags) {
    if (!metaTags.title) issues.push("missing page title");
    if (!metaTags.description) issues.push("no meta description");
    if (metaTags.h1s.length === 0) issues.push("no H1 heading");
    if (metaTags.h1s.length > 1)
      issues.push(`${metaTags.h1s.length} competing H1 tags`);
  }
  if (score < 50 && issues.length === 0)
    issues.push("weak keyword optimization");

  const prefix = score < 80 ? "60% of clicks go to the first 3 Google results. " : "";

  const diagnosis =
    issues.length > 0
      ? `${prefix}Found: ${issues.join(", ")}`
      : "Basic SEO structure in place";

  const fix =
    score < 80
      ? "Our redesign includes optimized meta tags, proper heading structure, and keyword-rich content."
      : "We'll maintain your SEO foundation and add structured data for richer search results.";

  return { diagnosis, fix };
}

function buildMobileInsight(score: number) {
  const prefix = score < 80 ? "Over half your visitors are on phones. " : "";

  const diagnosis =
    score < 50
      ? `${prefix}Your site isn't optimized for mobile visitors`
      : score < 80
        ? `${prefix}Some mobile experience issues detected`
        : "Mobile experience looks solid";

  const fix =
    score < 80
      ? "Your new site is built mobile-first with responsive layouts, touch-friendly buttons, and fast load times."
      : "We'll keep your mobile experience strong with modern responsive design patterns.";

  return { diagnosis, fix };
}

function buildCtaInsight(ctaCount: number) {
  const severity: "red" | "yellow" | "green" =
    ctaCount === 0 ? "red" : ctaCount < 3 ? "yellow" : "green";

  const prefix = ctaCount < 3 ? "Without clear next steps, visitors leave without taking action. " : "";

  const diagnosis =
    ctaCount === 0
      ? `${prefix}No clear calls-to-action found on your site`
      : ctaCount < 3
        ? `${prefix}Only ${ctaCount} call-to-action found — visitors may not know what to do next`
        : `${ctaCount} calls-to-action detected`;

  const fix =
    ctaCount < 3
      ? "Your new site features prominent CTAs in every section — phone links, contact forms, and action buttons that convert visitors into leads."
      : "We'll place strategic CTAs throughout your new site to maximize conversions.";

  return { severity, diagnosis, fix };
}

function buildAnalyticsInsight(
  hasAnalytics: boolean,
  analyticsDetected?: AuditResultCardProps["analyticsDetected"]
) {
  const severity: "red" | "yellow" | "green" = hasAnalytics
    ? "green"
    : "red";

  const prefix = !hasAnalytics ? "You can't improve what you can't measure. " : "";

  let diagnosis: string;
  if (!hasAnalytics) {
    diagnosis =
      `${prefix}No analytics tracking detected — you have no visibility into your traffic`;
  } else {
    const tools: string[] = [];
    if (analyticsDetected?.ga4) tools.push("Google Analytics");
    if (analyticsDetected?.gtm) tools.push("Tag Manager");
    if (analyticsDetected?.other?.length)
      tools.push(...analyticsDetected.other);
    diagnosis = `Tracking with ${tools.join(", ")}`;
  }

  const fix = !hasAnalytics
    ? "Your new site includes built-in analytics — see who visits, where they come from, and which pages convert."
    : "We'll integrate your analytics dashboard so you always know how your site performs.";

  return { severity, diagnosis, fix };
}

function InsightCard({
  title,
  score,
  severity,
  diagnosis,
  fix,
}: {
  title: string;
  score?: number;
  severity: "red" | "yellow" | "green";
  diagnosis: string;
  fix: string;
}) {
  return (
    <div
      className={`rounded-lg border-l-4 p-4 ${severityStyles[severity]}`}
    >
      <div className="mb-2 flex items-center justify-between">
        <h4 className="text-sm font-semibold text-gray-900">{title}</h4>
        {score !== undefined && (
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-bold ${severityBadge[severity]}`}
          >
            {score}/100
          </span>
        )}
      </div>
      <p className="mb-2 text-sm text-gray-700">{diagnosis}</p>
      <p className="text-xs text-gray-500">{fix}</p>
    </div>
  );
}

const VALUE_PROPS = [
  "Professional, conversion-optimized redesign",
  "Mobile-first responsive design",
  "SEO-optimized meta tags & content",
  "2 SEO blog posts per week",
  "Built-in analytics dashboard",
  "Custom domain with free SSL",
];

export default function AuditResultCard({
  seoScore,
  mobileScore,
  ctaCount,
  hasAnalytics,
  targetUrl,
  metaTags,
  analyticsDetected,
  onGenerateClick,
}: AuditResultCardProps) {
  const seoInsight = buildSeoInsight(seoScore, metaTags);
  const mobileInsight = buildMobileInsight(mobileScore);
  const ctaInsight = buildCtaInsight(ctaCount);
  const analyticsInsight = buildAnalyticsInsight(hasAnalytics, analyticsDetected);

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Website Audit Results
        </h3>
        <p className="text-sm text-gray-500">{targetUrl}</p>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <InsightCard
          title="SEO"
          score={seoScore}
          severity={getSeverity(seoScore)}
          diagnosis={seoInsight.diagnosis}
          fix={seoInsight.fix}
        />
        <InsightCard
          title="Mobile Experience"
          score={mobileScore}
          severity={getSeverity(mobileScore)}
          diagnosis={mobileInsight.diagnosis}
          fix={mobileInsight.fix}
        />
        <InsightCard
          title="Calls-to-Action"
          severity={ctaInsight.severity}
          diagnosis={ctaInsight.diagnosis}
          fix={ctaInsight.fix}
        />
        <InsightCard
          title="Analytics"
          severity={analyticsInsight.severity}
          diagnosis={analyticsInsight.diagnosis}
          fix={analyticsInsight.fix}
        />
      </div>

      <div className="rounded-lg bg-gray-50 p-4">
        <h4 className="mb-3 text-sm font-semibold text-gray-900">
          What your new website includes
        </h4>
        <div className="grid gap-2 sm:grid-cols-2">
          {VALUE_PROPS.map((prop) => (
            <div key={prop} className="flex items-start gap-2">
              <svg
                className="mt-0.5 h-4 w-4 shrink-0 text-blue-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4.5 12.75l6 6 9-13.5"
                />
              </svg>
              <span className="text-sm text-gray-700">{prop}</span>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-gray-500">
          Businesses that address these issues typically see significantly more inbound leads.
        </p>
      </div>

      {onGenerateClick && (
        <button
          onClick={onGenerateClick}
          className="mt-4 w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
        >
          Fix These Issues &rarr; Generate My Website
        </button>
      )}
    </div>
  );
}
