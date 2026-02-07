import { tool } from "@anthropic-ai/claude-code";
import { z } from "zod";
import dns from "dns/promises";
import net from "net";

/**
 * Check if an IP address is in a private/reserved range (SSRF protection).
 */
function isPrivateIp(ip: string): boolean {
  // IPv4-mapped IPv6 (e.g. ::ffff:127.0.0.1) — extract the IPv4 part
  const v4Mapped = ip.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i);
  const normalizedIp = v4Mapped ? v4Mapped[1] : ip;

  if (net.isIPv4(normalizedIp)) {
    const parts = normalizedIp.split(".").map(Number);
    const [a, b] = parts;
    // Loopback: 127.0.0.0/8
    if (a === 127) return true;
    // Private: 10.0.0.0/8
    if (a === 10) return true;
    // Private: 172.16.0.0/12
    if (a === 172 && b >= 16 && b <= 31) return true;
    // Private: 192.168.0.0/16
    if (a === 192 && b === 168) return true;
    // Link-local / cloud metadata: 169.254.0.0/16
    if (a === 169 && b === 254) return true;
    // Current network: 0.0.0.0/8
    if (a === 0) return true;
    return false;
  }

  if (net.isIPv6(normalizedIp)) {
    const lower = normalizedIp.toLowerCase();
    // Loopback ::1
    if (lower === "::1") return true;
    // Unspecified ::
    if (lower === "::") return true;
    // Link-local fe80::/10
    if (lower.startsWith("fe80:")) return true;
    // Unique local fc00::/7
    if (lower.startsWith("fc") || lower.startsWith("fd")) return true;
    return false;
  }

  // Unknown format — block to be safe
  return true;
}

/**
 * Validate a URL for SSRF safety: resolve DNS and check all IPs.
 */
async function validateUrlForSsrf(urlStr: string): Promise<void> {
  const parsed = new URL(urlStr);

  // Only allow http and https
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error(`Blocked: unsupported protocol "${parsed.protocol}"`);
  }

  const hostname = parsed.hostname;

  // If hostname is already an IP, check directly
  if (net.isIP(hostname)) {
    if (isPrivateIp(hostname)) {
      throw new Error(`Blocked: cannot fetch private/reserved IP address`);
    }
    return;
  }

  // Resolve DNS and check all returned IPs
  let addresses: string[];
  try {
    const results = await dns.resolve(hostname);
    // resolve() returns string[] for A records; also try AAAA
    let v6: string[] = [];
    try {
      v6 = await dns.resolve6(hostname);
    } catch {
      // No AAAA records is fine
    }
    addresses = [...results, ...v6];
  } catch {
    throw new Error(`DNS resolution failed for "${hostname}"`);
  }

  if (addresses.length === 0) {
    throw new Error(`No DNS records found for "${hostname}"`);
  }

  for (const addr of addresses) {
    if (isPrivateIp(addr)) {
      throw new Error(`Blocked: "${hostname}" resolves to private/reserved IP`);
    }
  }
}

export const fetchPageTool = tool(
  "fetch_page",
  "Fetch a web page and return its HTML content for analysis. Use this to crawl the target site and internal links.",
  {
    url: z.string().url().describe("The URL to fetch"),
  },
  async (args) => {
    try {
      // SSRF protection: validate URL before fetching
      await validateUrlForSsrf(args.url);

      const res = await fetch(args.url, {
        headers: {
          "User-Agent": "SMB-DM-Audit/1.0",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
        signal: AbortSignal.timeout(10_000),
        redirect: "follow",
      });

      // After redirect, validate final URL too
      if (res.url !== args.url) {
        await validateUrlForSsrf(res.url);
      }

      if (!res.ok) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Failed to fetch ${args.url}: HTTP ${res.status} ${res.statusText}`,
            },
          ],
        };
      }

      const html = await res.text();
      // Truncate to fit within context window
      const truncated = html.slice(0, 50_000);

      return {
        content: [
          {
            type: "text" as const,
            text: `Fetched ${args.url} (${html.length} bytes, showing first ${truncated.length}):\n\n${truncated}`,
          },
        ],
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown fetch error";
      return {
        content: [
          {
            type: "text" as const,
            text: `ERROR fetching ${args.url}: ${message}`,
          },
        ],
      };
    }
  }
);
