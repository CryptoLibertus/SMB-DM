/**
 * HTTP client to trigger Vercel deployment via the main app's internal API.
 * Called after each version's files are stored in Blob and marked "ready".
 */
export async function triggerDeployment(
  siteId: string,
  siteVersionId: string
): Promise<{ previewUrl: string }> {
  const appUrl = process.env.APP_URL;
  const secret = process.env.WORKER_AUTH_SECRET;

  if (!appUrl || !secret) {
    throw new Error("APP_URL and WORKER_AUTH_SECRET must be set");
  }

  const res = await fetch(`${appUrl}/api/internal/deploy-version`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${secret}`,
    },
    body: JSON.stringify({ siteId, siteVersionId }),
    signal: AbortSignal.timeout(120_000), // 120s — deployments can take 30-60s
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "unknown error");
    throw new Error(`Deploy callback failed ${res.status}: ${body}`);
  }

  const json = await res.json();
  return { previewUrl: json.data.previewUrl };
}
