import { resolve } from "dns/promises";
import type { DnsAnalysis } from "../types";

/** Known registrar patterns in WHOIS data or NS hostnames */
const REGISTRAR_PATTERNS: [RegExp, string][] = [
  [/godaddy/i, "GoDaddy"],
  [/namecheap/i, "Namecheap"],
  [/cloudflare/i, "Cloudflare"],
  [/google/i, "Google Domains"],
  [/hover/i, "Hover"],
  [/name\.com/i, "Name.com"],
  [/networksolutions/i, "Network Solutions"],
  [/bluehost/i, "Bluehost"],
  [/hostgator/i, "HostGator"],
  [/dreamhost/i, "DreamHost"],
  [/ionos/i, "IONOS"],
  [/1and1/i, "1&1 IONOS"],
  [/squarespace/i, "Squarespace"],
  [/wix/i, "Wix"],
  [/wordpress/i, "WordPress.com"],
  [/epik/i, "Epik"],
  [/porkbun/i, "Porkbun"],
  [/dynadot/i, "Dynadot"],
  [/gandi/i, "Gandi"],
  [/enom/i, "eNom"],
  [/tucows/i, "Tucows"],
  [/register\.com/i, "Register.com"],
  [/domain\.com/i, "Domain.com"],
  [/aws|amazon|route53/i, "AWS Route 53"],
  [/azure|microsoft/i, "Azure DNS"],
  [/dnsimple/i, "DNSimple"],
  [/vercel/i, "Vercel"],
];

/** Systems where DNS switching may be difficult */
const LOCKED_NS_PATTERNS = [
  /wix\.com$/i,
  /squarespace-dns\.com$/i,
  /wordpress\.com$/i,
];

/** Infer registrar from nameserver hostnames */
function inferRegistrar(nameservers: string[]): string | null {
  const nsText = nameservers.join(" ");
  for (const [pattern, name] of REGISTRAR_PATTERNS) {
    if (pattern.test(nsText)) return name;
  }
  return null;
}

/** Assess whether DNS is easily switchable */
function assessSwitchability(nameservers: string[]): boolean {
  // If any nameserver matches a known locked platform, switching may be harder
  for (const ns of nameservers) {
    for (const pattern of LOCKED_NS_PATTERNS) {
      if (pattern.test(ns)) return false;
    }
  }
  // Most DNS is switchable
  return true;
}

export async function analyzeDns(url: string): Promise<DnsAnalysis> {
  try {
    const hostname = new URL(url).hostname;
    // Strip www. for DNS lookup
    const domain = hostname.replace(/^www\./, "");

    // Look up nameservers via DNS
    let nameservers: string[] = [];
    try {
      const nsRecords = await resolve(domain, "NS");
      nameservers = nsRecords.map((ns) => ns.toLowerCase());
    } catch {
      // NS lookup can fail for subdomains; try parent domain
      const parts = domain.split(".");
      if (parts.length > 2) {
        const parentDomain = parts.slice(-2).join(".");
        try {
          const nsRecords = await resolve(parentDomain, "NS");
          nameservers = nsRecords.map((ns) => ns.toLowerCase());
        } catch {
          // Give up on NS lookup
        }
      }
    }

    const registrar = inferRegistrar(nameservers);
    const switchable = assessSwitchability(nameservers);

    return { registrar, nameservers, switchable };
  } catch {
    return { registrar: null, nameservers: [], switchable: false };
  }
}
