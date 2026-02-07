interface WorkerAuditAnalyzePayload {
  auditId: string;
  targetUrl: string;
  basicAuditData: {
    seoScore: number;
    mobileScore: number;
    ctaAnalysis: { elements: { type: string; text: string; location: string }[] };
    metaTags: {
      title: string | null;
      description: string | null;
      h1s: string[];
      robots: string | null;
    };
    analyticsDetected: { ga4: boolean; gtm: boolean; other: string[] };
    dnsInfo: {
      registrar: string | null;
      nameservers: string[];
      switchable: boolean;
    };
  };
}

/**
 * Trigger the Fly.io worker to run AI-powered audit analysis.
 * Fire-and-forget: we don't await the response body.
 * The worker updates the DB directly when analysis completes.
 */
export async function triggerWorkerAuditAnalysis(
  payload: WorkerAuditAnalyzePayload
): Promise<void> {
  const workerUrl = process.env.WORKER_URL;
  const workerSecret = process.env.WORKER_AUTH_SECRET;

  if (!workerUrl || !workerSecret) {
    throw new Error("WORKER_URL and WORKER_AUTH_SECRET must be set");
  }

  const res = await fetch(`${workerUrl}/audit-analyze`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${workerSecret}`,
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(30_000),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "unknown error");
    throw new Error(`Worker returned ${res.status}: ${text}`);
  }
}
