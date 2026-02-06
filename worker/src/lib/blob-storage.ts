import { put } from "@vercel/blob";
import * as fs from "fs/promises";
import * as path from "path";

export async function uploadSiteFiles(
  workspacePath: string,
  siteId: string,
  versionNumber: number
): Promise<{ blobUrl: string; fileCount: number }> {
  const files: Record<string, string> = {};
  await collectFiles(workspacePath, workspacePath, files);

  const payload = JSON.stringify(files);
  const blobPath = `sites/${siteId}/v${versionNumber}/source.json`;

  const blob = await put(blobPath, payload, {
    access: "public",
    contentType: "application/json",
  });

  return {
    blobUrl: blob.url,
    fileCount: Object.keys(files).length,
  };
}

async function collectFiles(
  basePath: string,
  currentPath: string,
  files: Record<string, string>
): Promise<void> {
  const entries = await fs.readdir(currentPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(currentPath, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".next") continue;
      await collectFiles(basePath, fullPath, files);
    } else {
      const relativePath = path.relative(basePath, fullPath);
      files[relativePath] = await fs.readFile(fullPath, "utf-8");
    }
  }
}
