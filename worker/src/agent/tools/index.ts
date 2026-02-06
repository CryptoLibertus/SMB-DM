import { createSdkMcpServer } from "@anthropic-ai/claude-code";
import { updateProgressTool } from "./update-progress.js";
import { storeVersionTool } from "./store-version.js";
import { validateSiteTool } from "./validate-site.js";

export function createWorkerToolServer() {
  return createSdkMcpServer({
    name: "worker-tools",
    version: "1.0.0",
    tools: [updateProgressTool, storeVersionTool, validateSiteTool],
  });
}
