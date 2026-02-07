import { createSdkMcpServer } from "@anthropic-ai/claude-code";
import { fetchPageTool } from "./fetch-page.js";
import { storeAnalysisTool } from "./store-analysis.js";

export function createAuditToolServer() {
  return createSdkMcpServer({
    name: "audit-tools",
    version: "1.0.0",
    tools: [fetchPageTool, storeAnalysisTool],
  });
}
