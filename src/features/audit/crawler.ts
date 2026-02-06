import type { CrawlResult } from "./types";

const FETCH_TIMEOUT_MS = 5_000;
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

export async function crawlUrl(url: string): Promise<CrawlResult> {
  try {
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
  });
  return blob.url;
}
