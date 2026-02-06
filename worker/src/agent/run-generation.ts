import { query } from "@anthropic-ai/claude-code";
import * as fs from "fs/promises";
import { db } from "../db/client.js";
import { siteVersions } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { buildSystemPrompt } from "./system-prompt.js";
import { buildUserPrompt } from "./agent-config.js";
import { createWorkerToolServer } from "./tools/index.js";
import type { GenerateRequest, GenerateResponse, VersionResult } from "../types/api.js";
import type { DesignDirective, BusinessContext } from "../types/generation.js";
import type { AuditPipelineResult } from "../types/audit.js";

async function generateVersion(
  siteId: string,
  siteVersionId: string,
  versionNumber: number,
  directive: DesignDirective,
  businessContext: BusinessContext,
  auditData: AuditPipelineResult | null
): Promise<{ status: "ready" | "failed"; error?: string }> {
  const workspacePath = `/tmp/gen-${siteId}/v${versionNumber}`;
  await fs.mkdir(workspacePath, { recursive: true });

  const systemPrompt = buildSystemPrompt(directive, versionNumber);
  const userPrompt = buildUserPrompt(
    directive,
    businessContext,
    auditData,
    workspacePath,
    siteId,
    siteVersionId
  );

  const workerTools = createWorkerToolServer();

  try {
    console.log(
      `[gen] Starting version ${versionNumber} for site ${siteId} (siteVersionId: ${siteVersionId})`
    );

    for await (const message of query({
      prompt: userPrompt,
      options: {
        customSystemPrompt: systemPrompt,
        model: "claude-opus-4-6",
        cwd: workspacePath,
        allowedTools: [
          "Write",
          "Read",
          "Edit",
          "Bash",
          "Glob",
          "mcp__worker-tools__update_progress",
          "mcp__worker-tools__store_version",
          "mcp__worker-tools__validate_site",
        ],
        mcpServers: {
          "worker-tools": workerTools,
        },
        permissionMode: "bypassPermissions",
        extraArgs: { "dangerously-skip-permissions": null },
        maxTurns: 40,
        stderr: (data: string) => console.error(`[gen-stderr] v${versionNumber}: ${data}`),
      },
    })) {
      if (message.type === "result") {
        if (message.subtype === "success") {
          console.log(
            `[gen] Version ${versionNumber} completed successfully (cost: $${message.total_cost_usd.toFixed(2)})`
          );
          return { status: "ready" };
        } else {
          const errorMsg = `Agent ended with ${message.subtype} after ${message.num_turns} turns`;
          console.error(
            `[gen] Version ${versionNumber} failed: ${errorMsg}`
          );
          return { status: "failed", error: errorMsg };
        }
      }
    }

    return { status: "ready" };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Unknown error";
    console.error(
      `[gen] Version ${versionNumber} threw error: ${errorMsg}`
    );
    return { status: "failed", error: errorMsg };
  } finally {
    // Clean up workspace
    try {
      await fs.rm(workspacePath, { recursive: true, force: true });
      console.log(`[gen] Cleaned up workspace ${workspacePath}`);
    } catch {
      // Ignore cleanup errors
    }
  }
}

export async function runGeneration(
  req: GenerateRequest
): Promise<GenerateResponse> {
  const startTime = Date.now();
  const results: VersionResult[] = [];

  console.log(
    `[gen] Starting generation ${req.generationId} for site ${req.siteId} (${req.versions.length} versions)`
  );

  for (const version of req.versions) {
    const versionStart = Date.now();

    // Mark version as actively generating in DB
    try {
      await db
        .update(siteVersions)
        .set({ status: "generating" })
        .where(eq(siteVersions.id, version.siteVersionId));
    } catch (err) {
      console.error(
        `[gen] Failed to update status for version ${version.versionNumber}:`,
        err
      );
    }

    const result = await generateVersion(
      req.siteId,
      version.siteVersionId,
      version.versionNumber,
      version.directive,
      req.businessContext,
      req.auditData
    );

    // If the agent failed, ensure DB reflects it
    if (result.status === "failed") {
      try {
        await db
          .update(siteVersions)
          .set({ status: "failed" })
          .where(eq(siteVersions.id, version.siteVersionId));
      } catch (err) {
        console.error(
          `[gen] Failed to mark version ${version.versionNumber} as failed:`,
          err
        );
      }
    }

    results.push({
      versionNumber: version.versionNumber,
      status: result.status,
      error: result.error,
      durationMs: Date.now() - versionStart,
    });

    console.log(
      `[gen] Version ${version.versionNumber}: ${result.status} (${Date.now() - versionStart}ms)`
    );
  }

  const totalDurationMs = Date.now() - startTime;
  console.log(
    `[gen] Generation ${req.generationId} complete in ${totalDurationMs}ms`
  );

  return {
    generationId: req.generationId,
    results,
    totalDurationMs,
  };
}
