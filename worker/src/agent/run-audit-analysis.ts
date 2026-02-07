import { query } from "@anthropic-ai/claude-code";
import * as fs from "fs/promises";
import { db } from "../db/client.js";
import { auditResults } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { buildAuditSystemPrompt } from "./audit-system-prompt.js";
import { buildAuditUserPrompt } from "./audit-config.js";
import { createAuditToolServer } from "./tools/audit-tools-index.js";
import type { AuditAnalyzeRequest } from "../types/audit-analysis.js";

export async function runAuditAnalysis(
  req: AuditAnalyzeRequest
): Promise<void> {
  const workspacePath = `/tmp/audit-${req.auditId}`;
  await fs.mkdir(workspacePath, { recursive: true });

  const systemPrompt = buildAuditSystemPrompt();
  const userPrompt = buildAuditUserPrompt(
    req.auditId,
    req.targetUrl,
    req.basicAuditData
  );

  const auditTools = createAuditToolServer();

  const ANALYSIS_TIMEOUT_MS = 120_000; // 2 minutes

  try {
    console.log(
      `[audit-analysis] Starting AI analysis for audit ${req.auditId} (${req.targetUrl})`
    );

    // Mark as analyzing
    await db
      .update(auditResults)
      .set({ aiAnalysisStatus: "analyzing" })
      .where(eq(auditResults.id, req.auditId));

    const abortController = new AbortController();
    const timeout = setTimeout(() => {
      abortController.abort();
    }, ANALYSIS_TIMEOUT_MS);

    try {
      for await (const message of query({
        prompt: userPrompt,
        options: {
          customSystemPrompt: systemPrompt,
          model: "claude-sonnet-4-5-20250929",
          cwd: workspacePath,
          allowedTools: [
            "mcp__audit-tools__fetch_page",
            "mcp__audit-tools__store_analysis",
          ],
          mcpServers: {
            "audit-tools": auditTools,
          },
          permissionMode: "bypassPermissions",
          extraArgs: { "dangerously-skip-permissions": null },
          maxTurns: 15,
          abortController,
          stderr: (data: string) =>
            console.error(`[audit-analysis-stderr] ${req.auditId}: ${data}`),
        },
      })) {
        if (message.type === "result") {
          if (message.subtype === "success") {
            console.log(
              `[audit-analysis] Audit ${req.auditId} completed successfully (cost: $${message.total_cost_usd.toFixed(2)})`
            );
          } else {
            const errorMsg = `Agent ended with ${message.subtype} after ${message.num_turns} turns`;
            console.error(
              `[audit-analysis] Audit ${req.auditId} failed: ${errorMsg}`
            );
            await db
              .update(auditResults)
              .set({ aiAnalysisStatus: "failed" })
              .where(eq(auditResults.id, req.auditId));
          }
        }
      }
    } finally {
      clearTimeout(timeout);
    }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Unknown error";
    console.error(
      `[audit-analysis] Audit ${req.auditId} threw error: ${errorMsg}`
    );

    try {
      await db
        .update(auditResults)
        .set({ aiAnalysisStatus: "failed" })
        .where(eq(auditResults.id, req.auditId));
    } catch {
      // Ignore DB error during failure handling
    }
  } finally {
    // Clean up workspace
    try {
      await fs.rm(workspacePath, { recursive: true, force: true });
      console.log(`[audit-analysis] Cleaned up workspace ${workspacePath}`);
    } catch {
      // Ignore cleanup errors
    }
  }
}
