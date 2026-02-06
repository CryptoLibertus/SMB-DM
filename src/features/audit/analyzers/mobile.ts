import type { MobileAnalysis } from "../types";

const PAGESPEED_API_URL =
  "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";

interface PageSpeedResult {
  lighthouseResult?: {
    categories?: {
      performance?: { score?: number };
    };
  };
}

/** Call PageSpeed Insights API for a Lighthouse mobile score */
async function fetchLighthouseScore(url: string): Promise<number | null> {
  try {
    const apiKey = process.env.PAGESPEED_API_KEY;
    const params = new URLSearchParams({
      url,
      strategy: "mobile",
      category: "performance",
    });
    if (apiKey) params.set("key", apiKey);

    const resp = await fetch(`${PAGESPEED_API_URL}?${params}`, {
      signal: AbortSignal.timeout(30_000),
    });

    if (!resp.ok) return null;

    const data = (await resp.json()) as PageSpeedResult;
    const score =
      data.lighthouseResult?.categories?.performance?.score ?? null;
    // Score is 0-1, convert to 0-100
    return score !== null ? Math.round(score * 100) : null;
  } catch {
    return null;
  }
}

export async function analyzeMobile(
  html: string,
  url: string
): Promise<MobileAnalysis> {
  // Check viewport meta tag
  const viewportMatch = html.match(
    /<meta[^>]+name=["']viewport["'][^>]+content=["']([^"']*)["']/i
  ) ?? html.match(
    /<meta[^>]+content=["']([^"']*)["'][^>]+name=["']viewport["']/i
  );
  const hasViewportMeta = !!viewportMatch;
  const viewportContent = viewportMatch ? viewportMatch[1] : "";

  // Check for responsive patterns in styles/links
  const hasMediaQueries = /@media\s*\([^)]*(?:max-width|min-width)/i.test(html);
  const hasResponsiveFramework =
    /bootstrap|tailwind|foundation/i.test(html);
  const hasFlexboxOrGrid =
    /display\s*:\s*(?:flex|grid)/i.test(html);
  const hasResponsiveStyles =
    hasMediaQueries || hasResponsiveFramework || hasFlexboxOrGrid;

  // Get Lighthouse score
  const lighthouseScore = await fetchLighthouseScore(url);

  // Calculate mobile score
  let score = 0;

  // Viewport meta present and properly configured
  if (hasViewportMeta) {
    score += 25;
    if (viewportContent.includes("width=device-width")) score += 10;
    if (viewportContent.includes("initial-scale=1")) score += 5;
  }

  // Responsive styles detected
  if (hasResponsiveStyles) score += 20;

  // Use Lighthouse score if available (weight it heavily)
  if (lighthouseScore !== null) {
    // Lighthouse contributes up to 40 points
    score += Math.round(lighthouseScore * 0.4);
  } else {
    // Without Lighthouse, give some baseline if viewport + responsive
    if (hasViewportMeta && hasResponsiveStyles) score += 25;
  }

  score = Math.min(100, Math.max(0, score));

  return {
    mobileScore: score,
    hasViewportMeta,
    hasResponsiveStyles,
    lighthouseScore,
  };
}
