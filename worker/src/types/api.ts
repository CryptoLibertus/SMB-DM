import type { DesignDirective, BusinessContext } from "./generation.js";
import type { AuditPipelineResult } from "./audit.js";

export interface GenerateRequest {
  generationId: string;
  siteId: string;
  versions: {
    siteVersionId: string;
    versionNumber: number;
    directive: DesignDirective;
  }[];
  businessContext: BusinessContext;
  auditData: AuditPipelineResult | null;
  aiAnalysis?: {
    summary: string;
    overallGrade: string;
    findings: {
      category: string;
      severity: "critical" | "warning" | "info";
      title: string;
      detail: string;
      recommendation: string;
    }[];
    topPriorities: string[];
  } | null;
}

export interface VersionResult {
  versionNumber: number;
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
