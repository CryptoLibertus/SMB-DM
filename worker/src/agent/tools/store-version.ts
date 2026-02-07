import { tool } from "@anthropic-ai/claude-code";
import { z } from "zod";
import { db } from "../../db/client.js";
import { siteVersions } from "../../db/schema.js";
import { eq } from "drizzle-orm";
import { uploadSiteFiles } from "../../lib/blob-storage.js";

export const storeVersionTool = tool(
  "store_version",
  "Store the completed site version. Reads all files from the workspace, uploads them to Vercel Blob Storage as a JSON bundle, and updates the database record to 'ready'. Call this only AFTER validate_site returns VALID.",
  {
    workspacePath: z
      .string()
      .describe("Absolute path to the workspace directory"),
    siteId: z.string().uuid().describe("The site ID"),
    siteVersionId: z.string().uuid().describe("The site version ID"),
    versionNumber: z
      .number()
      .min(1)
      .max(1)
      .describe("Version number (1)"),
  },
  async (args) => {
    try {
      const { blobUrl, fileCount } = await uploadSiteFiles(
        args.workspacePath,
        args.siteId,
        args.versionNumber
      );

      const previewUrl = `https://preview-${args.siteId.slice(0, 8)}-v${args.versionNumber}.vercel.app`;

      await db
        .update(siteVersions)
        .set({
          generatedCodeRef: blobUrl,
          previewUrl,
          status: "ready",
        })
        .where(eq(siteVersions.id, args.siteVersionId));

      return {
        content: [
          {
            type: "text" as const,
            text: `Version ${args.versionNumber} stored successfully.\nBlob URL: ${blobUrl}\nPreview URL: ${previewUrl}\nFiles stored: ${fileCount}`,
          },
        ],
      };
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unknown storage error";
      return {
        content: [
          {
            type: "text" as const,
            text: `ERROR storing version: ${message}`,
          },
        ],
      };
    }
  }
);
