import type { AnalyticsAnalysis } from "../types";

export function analyzeAnalytics(html: string): AnalyticsAnalysis {
  const other: string[] = [];

  // GA4 detection - gtag.js with G- measurement ID
  const ga4 =
    /gtag\s*\(\s*['"]config['"]\s*,\s*['"]G-/i.test(html) ||
    /googletagmanager\.com\/gtag\/js\?id=G-/i.test(html);

  // GTM detection
  const gtm =
    /googletagmanager\.com\/gtm\.js/i.test(html) ||
    /GTM-[A-Z0-9]+/i.test(html);

  // Universal Analytics (legacy)
  if (
    /google-analytics\.com\/analytics\.js/i.test(html) ||
    /google-analytics\.com\/ga\.js/i.test(html) ||
    /gtag\s*\(\s*['"]config['"]\s*,\s*['"]UA-/i.test(html)
  ) {
    other.push("universal_analytics");
  }

  // Facebook Pixel
  if (
    /connect\.facebook\.net\/.*\/fbevents\.js/i.test(html) ||
    /fbq\s*\(\s*['"]init['"]/i.test(html)
  ) {
    other.push("facebook_pixel");
  }

  // Hotjar
  if (/static\.hotjar\.com/i.test(html) || /hj\s*\(\s*['"]stateChange['"]/i.test(html)) {
    other.push("hotjar");
  }

  // Microsoft Clarity
  if (/clarity\.ms\/tag/i.test(html)) {
    other.push("microsoft_clarity");
  }

  // HubSpot
  if (/js\.hs-scripts\.com/i.test(html) || /js\.hs-analytics\.net/i.test(html)) {
    other.push("hubspot");
  }

  // Segment
  if (/cdn\.segment\.com\/analytics\.js/i.test(html)) {
    other.push("segment");
  }

  // Mixpanel
  if (/cdn\.mxpnl\.com/i.test(html) || /mixpanel\.com\/track/i.test(html)) {
    other.push("mixpanel");
  }

  // PostHog
  if (/posthog/i.test(html) && /ph\.capture/i.test(html)) {
    other.push("posthog");
  }

  return { ga4, gtm, other };
}
