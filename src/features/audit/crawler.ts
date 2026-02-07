import type { CrawlResult, ExtractedImage } from "./types";
import { validateUrlForSsrf } from "@/lib/ssrf";

const FETCH_TIMEOUT_MS = 15_000;
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

export async function crawlUrl(url: string): Promise<CrawlResult> {
  try {
    // SSRF protection: validate URL before fetching
    await validateUrlForSsrf(url);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    const response = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
      signal: controller.signal,
      redirect: "follow",
    });

    clearTimeout(timer);

    const statusCode = response.status;
    const finalUrl = response.url;
    const html = await response.text();

    return {
      html,
      url,
      finalUrl,
      statusCode,
      screenshotDesktopBuffer: null,
      screenshotMobileBuffer: null,
      error: null,
    };
  } catch (err) {
    return {
      html: "",
      url,
      finalUrl: url,
      statusCode: 0,
      screenshotDesktopBuffer: null,
      screenshotMobileBuffer: null,
      error: err instanceof Error ? err.message : "Unknown crawl error",
    };
  }
}

/**
 * Extract images from HTML: <img> tags, CSS background-image URLs, and OG image meta tags.
 * Filters out tracking pixels, data URIs, and tiny images.
 */
export function extractImages(html: string, baseUrl: string): ExtractedImage[] {
  const images: ExtractedImage[] = [];
  const seen = new Set<string>();

  function resolveUrl(src: string): string | null {
    if (!src || src.startsWith("data:")) return null;
    try {
      return new URL(src, baseUrl).href;
    } catch {
      return null;
    }
  }

  function addImage(img: ExtractedImage) {
    if (seen.has(img.src)) return;
    // Filter tracking pixels (tiny images)
    if (img.width !== null && img.height !== null && img.width <= 3 && img.height <= 3) return;
    seen.add(img.src);
    images.push(img);
  }

  // <img> tags
  const imgRegex = /<img\s[^>]*>/gi;
  let match;
  while ((match = imgRegex.exec(html)) !== null) {
    const tag = match[0];
    const srcMatch = tag.match(/src=["']([^"']+)["']/i);
    if (!srcMatch) continue;
    const resolved = resolveUrl(srcMatch[1]);
    if (!resolved) continue;

    const altMatch = tag.match(/alt=["']([^"']*)["']/i);
    const widthMatch = tag.match(/width=["']?(\d+)["']?/i);
    const heightMatch = tag.match(/height=["']?(\d+)["']?/i);

    addImage({
      src: resolved,
      alt: altMatch ? altMatch[1] : null,
      width: widthMatch ? parseInt(widthMatch[1], 10) : null,
      height: heightMatch ? parseInt(heightMatch[1], 10) : null,
      context: "img_tag",
    });
  }

  // CSS background-image URLs
  const bgRegex = /background(?:-image)?\s*:[^;]*url\(["']?([^"')]+)["']?\)/gi;
  while ((match = bgRegex.exec(html)) !== null) {
    const resolved = resolveUrl(match[1]);
    if (!resolved) continue;
    addImage({
      src: resolved,
      alt: null,
      width: null,
      height: null,
      context: "css_background",
    });
  }

  // OG image meta tags
  const ogRegex = /<meta\s[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["'][^>]*>/gi;
  const ogRegex2 = /<meta\s[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["'][^>]*>/gi;
  for (const re of [ogRegex, ogRegex2]) {
    while ((match = re.exec(html)) !== null) {
      const resolved = resolveUrl(match[1]);
      if (!resolved) continue;
      addImage({
        src: resolved,
        alt: null,
        width: null,
        height: null,
        context: "og_image",
      });
    }
  }

  return images;
}

export async function storeScreenshot(
  buffer: Buffer,
  auditId: string,
  type: "desktop" | "mobile"
): Promise<string> {
  // Screenshot storage preserved for future use with external screenshot API
  const { put } = await import("@vercel/blob");
  const filename = `audit-screenshots/${auditId}/${type}.png`;
  const blob = await put(filename, buffer, {
    access: "public",
    contentType: "image/png",
    addRandomSuffix: true,
  });
  return blob.url;
}
