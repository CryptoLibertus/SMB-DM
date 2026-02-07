import type { AuditAnalyzeRequest } from "../types/audit-analysis.js";

export function buildAuditUserPrompt(
  auditId: string,
  targetUrl: string,
  basicAuditData: AuditAnalyzeRequest["basicAuditData"]
): string {
  const ctaCount = basicAuditData.ctaAnalysis.elements.length;
  const ctaList =
    ctaCount > 0
      ? basicAuditData.ctaAnalysis.elements
          .map((e) => `  - ${e.type}: "${e.text}" (${e.location})`)
          .join("\n")
      : "  (none detected)";

  const analytics = [];
  if (basicAuditData.analyticsDetected.ga4) analytics.push("GA4");
  if (basicAuditData.analyticsDetected.gtm) analytics.push("GTM");
  if (basicAuditData.analyticsDetected.other.length > 0)
    analytics.push(...basicAuditData.analyticsDetected.other);

  return `Analyze this website for CRO effectiveness:

**URL:** ${targetUrl}
**Audit ID:** ${auditId}

## Basic Audit Scores (already computed)

- SEO Score: ${basicAuditData.seoScore}/100
- Mobile Score: ${basicAuditData.mobileScore}/100
- Meta Title: ${basicAuditData.metaTags.title ?? "(missing)"}
- Meta Description: ${basicAuditData.metaTags.description ?? "(missing)"}
- H1 Tags: ${basicAuditData.metaTags.h1s.length > 0 ? basicAuditData.metaTags.h1s.join(", ") : "(none)"}
- CTAs Found (${ctaCount}):
${ctaList}
- Analytics: ${analytics.length > 0 ? analytics.join(", ") : "None detected"}
- DNS/Registrar: ${basicAuditData.dnsInfo.registrar ?? "Unknown"}

## Instructions

1. Start by fetching the homepage with \`fetch_page\` using URL: ${targetUrl}
2. Look for internal links to important pages (services, about, contact) and fetch up to 3 of them
3. Analyze the content against CRO best practices
4. Call \`store_analysis\` with your complete findings, using audit ID: ${auditId}`;
}
