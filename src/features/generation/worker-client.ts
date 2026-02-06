import type { AuditPipelineResult } from "@/features/audit/types";

interface WorkerGenerateRequest {
  generationId: string;
  siteId: string;
  versions: {
    siteVersionId: string;
    versionNumber: 1 | 2 | 3;
    directive: {
      versionNumber: number;
      name: string;
      description: string;
      colorPalette: string[];
      layoutType: string;
      typography: string;
    };
  }[];
  businessContext: {
    businessName: string;
    industry: string;
    services: string[];
    locations: string[];
    phone: string | null;
    contactEmail: string;
    targetKeywords: string[];
  };
  auditData: AuditPipelineResult | null;
}

/**
 * Trigger the Fly.io worker to generate site versions.
 * Fire-and-forget: we don't await the response body.
 * The worker updates the DB directly as each version completes.
 */
export async function triggerWorkerGeneration(
  payload: WorkerGenerateRequest
): Promise<void> {
  const workerUrl = process.env.WORKER_URL;
  const workerSecret = process.env.WORKER_AUTH_SECRET;

  if (!workerUrl || !workerSecret) {
    throw new Error("WORKER_URL and WORKER_AUTH_SECRET must be set");
  }

  const res = await fetch(`${workerUrl}/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${workerSecret}`,
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(10_000), // 10s timeout for the initial POST
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "unknown error");
    throw new Error(`Worker returned ${res.status}: ${text}`);
  }

  // We don't await the response body — the DB is the source of truth
}
