import type { DesignDirective, BusinessContext } from "./generation.js";
import type { AuditPipelineResult } from "./audit.js";

export interface GenerateRequest {
  generationId: string;
  siteId: string;
  versions: {
    siteVersionId: string;
    versionNumber: 1 | 2 | 3;
    directive: DesignDirective;
  }[];
  businessContext: BusinessContext;
  auditData: AuditPipelineResult | null;
}

export interface VersionResult {
  versionNumber: 1 | 2 | 3;
  status: "ready" | "failed";
  previewUrl?: string;
  blobUrl?: string;
  error?: string;
  durationMs: number;
}

export interface GenerateResponse {
  generationId: string;
  results: VersionResult[];
  totalDurationMs: number;
}
