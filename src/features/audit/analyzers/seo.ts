import type { SeoAnalysis } from "../types";

/** Extract significant words from text, filtering out stopwords and short tokens */
function extractKeywords(text: string): string[] {
  const stopwords = new Set([
    "a", "an", "the", "is", "are", "was", "were", "be", "been", "being",
    "have", "has", "had", "do", "does", "did", "will", "would", "shall",
    "should", "may", "might", "must", "can", "could", "and", "but", "or",
    "nor", "not", "so", "yet", "for", "at", "by", "from", "in", "into",
    "of", "on", "to", "with", "as", "if", "than", "that", "this", "it",
    "its", "your", "our", "we", "you", "they", "their", "he", "she",
  ]);
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !stopwords.has(w))
    .slice(0, 10);
}

/** Fetch robots.txt for the given URL's origin */
async function fetchRobotsTxt(url: string): Promise<string | null> {
  try {
    const origin = new URL(url).origin;
    const resp = await fetch(`${origin}/robots.txt`, {
      signal: AbortSignal.timeout(15_000),
    });
    if (!resp.ok) return null;
    const text = await resp.text();
    // Sanity check: robots.txt should be plain text
    if (text.includes("<!DOCTYPE") || text.includes("<html")) return null;
    return text;
  } catch {
    return null;
  }
}

export async function analyzeSeo(
  html: string,
  url: string
): Promise<SeoAnalysis> {
  // Extract title
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim() : null;

  // Extract meta description
  const descMatch = html.match(
    /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i
  ) ?? html.match(
    /<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["']/i
  );
  const description = descMatch ? descMatch[1].trim() : null;

  // Extract H1s
  const h1Regex = /<h1[^>]*>([\s\S]*?)<\/h1>/gi;
  const h1s: string[] = [];
  let h1Match;
  while ((h1Match = h1Regex.exec(html)) !== null) {
    h1s.push(h1Match[1].replace(/<[^>]+>/g, "").trim());
  }

  // Extract H2s (for scoring)
  const h2Regex = /<h2[^>]*>([\s\S]*?)<\/h2>/gi;
  const h2s: string[] = [];
  let h2Match;
  while ((h2Match = h2Regex.exec(html)) !== null) {
    h2s.push(h2Match[1].replace(/<[^>]+>/g, "").trim());
  }

  // Robots meta
  const robotsMatch = html.match(
    /<meta[^>]+name=["']robots["'][^>]+content=["']([^"']*)["']/i
  ) ?? html.match(
    /<meta[^>]+content=["']([^"']*)["'][^>]+name=["']robots["']/i
  );
  const robots = robotsMatch ? robotsMatch[1].trim() : null;

  // Robots.txt
  const robotsTxt = await fetchRobotsTxt(url);

  // Keyword analysis
  const titleKeywords = title ? extractKeywords(title) : [];
  const descriptionKeywords = description ? extractKeywords(description) : [];
  const h1Keywords = h1s.length > 0 ? extractKeywords(h1s.join(" ")) : [];

  // Compute SEO score (0-100)
  let score = 0;

  // Title present and reasonable length (15-60 chars)
  if (title) {
    score += 15;
    if (title.length >= 15 && title.length <= 60) score += 5;
  }

  // Meta description present and reasonable length (50-160 chars)
  if (description) {
    score += 15;
    if (description.length >= 50 && description.length <= 160) score += 5;
  }

  // H1 present (exactly one is ideal)
  if (h1s.length === 1) {
    score += 15;
  } else if (h1s.length > 1) {
    score += 8; // Multiple H1s is suboptimal
  }

  // H2 structure present
  if (h2s.length > 0) {
    score += 10;
    if (h2s.length >= 2 && h2s.length <= 8) score += 5;
  }

  // Robots meta not blocking indexing
  if (!robots || !robots.includes("noindex")) {
    score += 10;
  }

  // Robots.txt exists
  if (robotsTxt) {
    score += 5;
  }

  // Keyword overlap between title and H1
  if (titleKeywords.length > 0 && h1Keywords.length > 0) {
    const overlap = titleKeywords.filter((k) => h1Keywords.includes(k));
    if (overlap.length > 0) score += 10;
  }

  // HTML has lang attribute
  if (/<html[^>]+lang=/i.test(html)) score += 5;

  score = Math.min(100, Math.max(0, score));

  return {
    seoScore: score,
    metaTags: { title, description, h1s, robots },
    robotsTxt,
    keywordAnalysis: { titleKeywords, descriptionKeywords, h1Keywords },
  };
}
