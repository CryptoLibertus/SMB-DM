const VERCEL_API_BASE = "https://api.vercel.com";

if (!process.env.VERCEL_API_TOKEN) {
  throw new Error("VERCEL_API_TOKEN is not set");
}

const headers = {
  Authorization: `Bearer ${process.env.VERCEL_API_TOKEN}`,
  "Content-Type": "application/json",
};

/** Append ?teamId=... if VERCEL_TEAM_ID is set */
function withTeamId(url: string): string {
  const teamId = process.env.VERCEL_TEAM_ID;
  if (!teamId) return url;
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}teamId=${teamId}`;
}

export async function createProject(name: string) {
  const res = await fetch(withTeamId(`${VERCEL_API_BASE}/v9/projects`), {
    method: "POST",
    headers,
    body: JSON.stringify({ name, framework: "nextjs" }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Failed to create project: ${res.status} ${body}`);
  }
  return res.json();
}

export async function createDeployment(
  projectId: string,
  files: Record<string, string>
) {
  // Vercel API expects files as array of { file, data } with base64-encoded content
  const fileArray = Object.entries(files).map(([filePath, content]) => ({
    file: filePath,
    data: Buffer.from(content).toString("base64"),
    encoding: "base64" as const,
  }));

  const res = await fetch(
    withTeamId(`${VERCEL_API_BASE}/v13/deployments`),
    {
      method: "POST",
      headers,
      body: JSON.stringify({
        project: projectId,
        files: fileArray,
        projectSettings: { framework: "nextjs" },
      }),
    }
  );
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Failed to create deployment: ${res.status} ${body}`);
  }
  return res.json();
}

export async function attachDomain(projectId: string, domain: string) {
  const res = await fetch(
    withTeamId(`${VERCEL_API_BASE}/v10/projects/${projectId}/domains`),
    {
      method: "POST",
      headers,
      body: JSON.stringify({ name: domain }),
    }
  );
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Failed to attach domain: ${res.status} ${body}`);
  }
  return res.json();
}

export async function getDeployment(deploymentId: string) {
  const res = await fetch(
    withTeamId(`${VERCEL_API_BASE}/v13/deployments/${deploymentId}`),
    { headers },
  );
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Failed to get deployment: ${res.status} ${body}`);
  }
  return res.json();
}
