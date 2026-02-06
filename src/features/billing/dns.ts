import { db } from "@/lib/db";
import { sites } from "@/db/schema";
import { eq } from "drizzle-orm";
import { attachDomain } from "@/lib/vercel";
import dns from "node:dns/promises";

const VERCEL_IP = "76.76.21.21";
const VERCEL_CNAME = "cname.vercel-dns.com";

export interface DnsVerificationResult {
  domain: string;
  verified: boolean;
  aRecords: string[];
  cnameRecords: string[];
  message: string;
}

/**
 * Check if a domain's DNS resolves to Vercel IPs.
 * Returns a structured result with verification status.
 */
export async function verifyDnsPropagation(
  domain: string
): Promise<DnsVerificationResult> {
  let aRecords: string[] = [];
  let cnameRecords: string[] = [];

  try {
    aRecords = await dns.resolve4(domain);
  } catch {
    // No A records — that's fine, might use CNAME
  }

  try {
    cnameRecords = await dns.resolveCname(domain);
  } catch {
    // No CNAME records — that's fine, might use A records
  }

  const hasVercelA = aRecords.includes(VERCEL_IP);
  const hasVercelCname = cnameRecords.some(
    (record) => record === VERCEL_CNAME || record.endsWith(".vercel-dns.com")
  );

  const verified = hasVercelA || hasVercelCname;

  let message: string;
  if (verified) {
    message = "DNS verified! Your domain is pointing to Vercel.";
  } else if (aRecords.length === 0 && cnameRecords.length === 0) {
    message =
      "No DNS records found for this domain. Please add the required records.";
  } else {
    message =
      "DNS records found but not pointing to Vercel. Please update your records.";
  }

  return { domain, verified, aRecords, cnameRecords, message };
}

/**
 * Attach a custom domain to a tenant's site via Vercel API.
 * Updates the site's primaryDomain in the database.
 */
export async function attachDomainToSite(
  tenantId: string,
  domain: string
): Promise<void> {
  const [site] = await db
    .select()
    .from(sites)
    .where(eq(sites.tenantId, tenantId))
    .limit(1);

  if (!site) {
    throw new Error(`No site found for tenant ${tenantId}`);
  }

  // Attach domain via Vercel API
  await attachDomain(site.vercelProjectId, domain);

  // Update site record
  await db
    .update(sites)
    .set({ primaryDomain: domain, updatedAt: new Date() })
    .where(eq(sites.id, site.id));
}
