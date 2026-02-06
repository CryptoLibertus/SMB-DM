import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium";
import { put } from "@vercel/blob";
import type { CrawlResult } from "./types";

const DESKTOP_VIEWPORT = { width: 1280, height: 720 };
const MOBILE_VIEWPORT = { width: 375, height: 812 };
const NAVIGATION_TIMEOUT = 30_000;

async function getBrowser() {
  const executablePath = await chromium.executablePath();
  return puppeteer.launch({
    args: chromium.args,
    defaultViewport: DESKTOP_VIEWPORT,
    executablePath,
    headless: true,
  });
}

export async function crawlUrl(url: string): Promise<CrawlResult> {
  let browser;
  try {
    browser = await getBrowser();
    const page = await browser.newPage();

    // Set user agent to avoid bot detection
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );

    // Navigate with timeout
    const response = await page.goto(url, {
      waitUntil: "networkidle2",
      timeout: NAVIGATION_TIMEOUT,
    });

    const statusCode = response?.status() ?? 0;
    const finalUrl = page.url();
    const html = await page.content();

    // Desktop screenshot
    let screenshotDesktopBuffer: Buffer | null = null;
    try {
      await page.setViewport(DESKTOP_VIEWPORT);
      screenshotDesktopBuffer = (await page.screenshot({
        type: "png",
        fullPage: false,
      })) as Buffer;
    } catch {
      // Screenshot failure is non-fatal
    }

    // Mobile screenshot
    let screenshotMobileBuffer: Buffer | null = null;
    try {
      await page.setViewport(MOBILE_VIEWPORT);
      await page.waitForNetworkIdle({ timeout: 5_000 }).catch(() => {});
      screenshotMobileBuffer = (await page.screenshot({
        type: "png",
        fullPage: false,
      })) as Buffer;
    } catch {
      // Screenshot failure is non-fatal
    }

    await browser.close();

    return {
      html,
      url,
      finalUrl,
      statusCode,
      screenshotDesktopBuffer,
      screenshotMobileBuffer,
      error: null,
    };
  } catch (err) {
    if (browser) await browser.close().catch(() => {});
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
  const filename = `audit-screenshots/${auditId}/${type}.png`;
  const blob = await put(filename, buffer, {
    access: "public",
    contentType: "image/png",
  });
  return blob.url;
}
