import { put } from "@vercel/blob";
import type { SiteFiles } from "./types";

/**
 * Store generated site files in Vercel Blob Storage.
 * Files are stored as a JSON blob mapping filename → content.
 * Returns the blob URL to be saved as generatedCodeRef.
 */
export async function storeSiteFiles(
  siteId: string,
  versionNumber: number,
  files: SiteFiles
): Promise<string> {
  const payload = JSON.stringify(files);
  const pathname = `sites/${siteId}/v${versionNumber}/source.json`;

  const blob = await put(pathname, payload, {
    access: "public",
    contentType: "application/json",
    addRandomSuffix: true,
  });

  return blob.url;
}

/**
 * Retrieve generated site files from Vercel Blob Storage.
 * Fetches the JSON blob and parses it back into a file map.
 */
export async function retrieveSiteFiles(blobUrl: string): Promise<SiteFiles> {
  const response = await fetch(blobUrl);
  if (!response.ok) {
    throw new Error(
      `Failed to retrieve site files from blob storage: ${response.statusText}`
    );
  }
  const files: SiteFiles = await response.json();
  return files;
}
