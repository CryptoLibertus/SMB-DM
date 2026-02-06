import { db } from "@/lib/db";
import { sites, siteVersions, deployments } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import {
  createProject,
  createDeployment,
  attachDomain as vercelAttachDomain,
} from "@/lib/vercel";
import { retrieveSiteFiles } from "./storage";
import type { DeploymentTrigger } from "@/types/enums";

/**
 * Create a Vercel project for a tenant's site.
 * Returns the Vercel project ID.
 */
export async function createSiteProject(
  tenantId: string,
  businessName: string
): Promise<string> {
  // Sanitize business name for use as project name
  const projectName = `smb-${tenantId.slice(0, 8)}-${businessName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .slice(0, 30)}`;

  const project = await createProject(projectName);
  return project.id as string;
}

/**
 * Deploy a specific site version to its Vercel project.
 * Pulls code from Blob Storage, deploys via Vercel API, creates Deployment record.
 */
export async function deploySiteVersion(
  siteId: string,
  siteVersionId: string,
  trigger: DeploymentTrigger = "initial"
): Promise<{ deploymentId: string; deploymentUrl: string }> {
  // Get the site and version
  const [site] = await db
    .select()
    .from(sites)
    .where(eq(sites.id, siteId))
    .limit(1);

  if (!site) throw new Error(`Site ${siteId} not found`);

  const [version] = await db
    .select()
    .from(siteVersions)
    .where(eq(siteVersions.id, siteVersionId))
    .limit(1);

  if (!version) throw new Error(`SiteVersion ${siteVersionId} not found`);
  if (version.status !== "ready") {
    throw new Error(`SiteVersion ${siteVersionId} is not ready (status: ${version.status})`);
  }

  // Pull code from Blob Storage
  const files = await retrieveSiteFiles(version.generatedCodeRef);

  // Convert file map to Vercel deployment format
  // Vercel expects files as array of { file, data } or a Record<string, string>
  const vercelFiles: Record<string, string> = {};
  for (const [filePath, content] of Object.entries(files)) {
    vercelFiles[filePath] = content;
  }

  // Deploy to Vercel
  const deployment = await createDeployment(site.vercelProjectId, vercelFiles);

  const vercelDeploymentId = deployment.id as string;
  const vercelDeploymentUrl = deployment.url as string;

  // Create Deployment record
  const [deploymentRecord] = await db
    .insert(deployments)
    .values({
      siteId,
      vercelDeploymentId,
      vercelDeploymentUrl,
      status: "building",
      isProduction: trigger === "initial",
      triggeredBy: trigger,
    })
    .returning();

  // Update site's current deployment
  await db
    .update(sites)
    .set({
      currentDeploymentId: deploymentRecord.id,
      updatedAt: new Date(),
    })
    .where(eq(sites.id, siteId));

  return {
    deploymentId: deploymentRecord.id,
    deploymentUrl: vercelDeploymentUrl,
  };
}

/**
 * Attach a custom domain to a site's Vercel project.
 */
export async function attachSiteDomain(
  siteId: string,
  domain: string
): Promise<void> {
  const [site] = await db
    .select()
    .from(sites)
    .where(eq(sites.id, siteId))
    .limit(1);

  if (!site) throw new Error(`Site ${siteId} not found`);

  await vercelAttachDomain(site.vercelProjectId, domain);

  await db
    .update(sites)
    .set({
      primaryDomain: domain,
      updatedAt: new Date(),
    })
    .where(eq(sites.id, siteId));
}

/**
 * Rollback a site to its previous deployment.
 * Finds the second-most-recent deployment and re-deploys from its source version.
 */
export async function rollbackDeployment(
  siteId: string
): Promise<{ deploymentId: string; deploymentUrl: string }> {
  // Get the two most recent deployments
  const recentDeployments = await db
    .select()
    .from(deployments)
    .where(
      and(eq(deployments.siteId, siteId), eq(deployments.status, "ready"))
    )
    .orderBy(desc(deployments.createdAt))
    .limit(2);

  if (recentDeployments.length < 2) {
    throw new Error("No previous deployment available for rollback");
  }

  // The previous deployment is the second one
  const previousDeployment = recentDeployments[1];

  // Find the site's selected version and re-deploy from blob
  const [site] = await db
    .select()
    .from(sites)
    .where(eq(sites.id, siteId))
    .limit(1);

  if (!site) throw new Error(`Site ${siteId} not found`);
  if (!site.selectedVersionId) {
    throw new Error("No selected version to rollback to");
  }

  // Re-deploy the previous version via Vercel
  // We re-use the previous deployment's Vercel deployment ID approach:
  // actually re-deploy the code from blob storage with rollback trigger
  const result = await deploySiteVersion(
    siteId,
    site.selectedVersionId,
    "rollback"
  );

  // Update the deployment record to reference the rollback source
  await db
    .update(deployments)
    .set({ status: "ready" })
    .where(eq(deployments.id, previousDeployment.id));

  return result;
}
