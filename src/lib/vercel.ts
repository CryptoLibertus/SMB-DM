const VERCEL_API_BASE = "https://api.vercel.com";

if (!process.env.VERCEL_API_TOKEN) {
  throw new Error("VERCEL_API_TOKEN is not set");
}

const headers = {
  Authorization: `Bearer ${process.env.VERCEL_API_TOKEN}`,
  "Content-Type": "application/json",
};

export async function createProject(name: string) {
  const res = await fetch(`${VERCEL_API_BASE}/v9/projects`, {
    method: "POST",
    headers,
    body: JSON.stringify({ name, framework: "nextjs" }),
  });
  if (!res.ok) throw new Error(`Failed to create project: ${res.statusText}`);
  return res.json();
}

export async function createDeployment(projectId: string, files: Record<string, string>) {
  const res = await fetch(`${VERCEL_API_BASE}/v13/deployments`, {
    method: "POST",
    headers,
    body: JSON.stringify({ name: projectId, files, projectSettings: { framework: "nextjs" } }),
  });
  if (!res.ok) throw new Error(`Failed to create deployment: ${res.statusText}`);
  return res.json();
}

export async function attachDomain(projectId: string, domain: string) {
  const res = await fetch(`${VERCEL_API_BASE}/v10/projects/${projectId}/domains`, {
    method: "POST",
    headers,
    body: JSON.stringify({ name: domain }),
  });
  if (!res.ok) throw new Error(`Failed to attach domain: ${res.statusText}`);
  return res.json();
}

export async function getDeployment(deploymentId: string) {
  const res = await fetch(`${VERCEL_API_BASE}/v13/deployments/${deploymentId}`, {
    headers,
  });
  if (!res.ok) throw new Error(`Failed to get deployment: ${res.statusText}`);
  return res.json();
}
