import { tool } from "@anthropic-ai/claude-code";
import { z } from "zod";

export const fetchPageTool = tool(
  "fetch_page",
  "Fetch a web page and return its HTML content for analysis. Use this to crawl the target site and internal links.",
  {
    url: z.string().url().describe("The URL to fetch"),
  },
  async (args) => {
    try {
      const res = await fetch(args.url, {
        headers: {
          "User-Agent": "SMB-DM-Audit/1.0",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
        signal: AbortSignal.timeout(10_000),
        redirect: "follow",
      });

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
