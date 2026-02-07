import { tool } from "@anthropic-ai/claude-code";
import { z } from "zod";
import { db } from "../../db/client.js";
import { siteVersions } from "../../db/schema.js";
import { eq } from "drizzle-orm";

export const updateProgressTool = tool(
  "update_progress",
  "Update the generation progress for this site version. Call this after completing major milestones: initial file generation, validation pass, fixes applied.",
  {
    siteVersionId: z
      .string()
      .uuid()
      .describe("The site version ID being generated"),
    stage: z
      .enum([
        "generating_files",
        "validating",
        "fixing_issues",
        "storing",
        "complete",
        "failed",
      ])
      .describe("Current generation stage"),
    message: z.string().describe("Human-readable progress message"),
  },
  async (args) => {
    const statusMap: Record<string, "generating" | "ready" | "failed"> = {
      generating_files: "generating",
      validating: "generating",
      fixing_issues: "generating",
      storing: "generating",
      complete: "ready",
      failed: "failed",
    };

    const dbStatus = statusMap[args.stage] ?? "generating";

    await db
      .update(siteVersions)
      .set({
        status: dbStatus,
        progressStage: args.stage,
        progressMessage: args.message,
      })
      .where(eq(siteVersions.id, args.siteVersionId));

    console.log(`[${args.siteVersionId}] ${args.stage}: ${args.message}`);

    return {
      content: [
        { type: "text" as const, text: `Progress updated: ${args.stage}` },
      ],
    };
  }
);
