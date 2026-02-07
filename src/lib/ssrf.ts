import dns from "dns/promises";
import net from "net";

/**
 * Check if an IP address is in a private/reserved range (SSRF protection).
 */
function isPrivateIp(ip: string): boolean {
  // IPv4-mapped IPv6 (e.g. ::ffff:127.0.0.1) — extract the IPv4 part
  const v4Mapped = ip.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i);
  const normalizedIp = v4Mapped ? v4Mapped[1] : ip;

  if (net.isIPv4(normalizedIp)) {
    const parts = normalizedIp.split(".").map(Number);
    const [a, b] = parts;
    if (a === 127) return true;     // Loopback: 127.0.0.0/8
    if (a === 10) return true;      // Private: 10.0.0.0/8
    if (a === 172 && b >= 16 && b <= 31) return true; // Private: 172.16.0.0/12
    if (a === 192 && b === 168) return true; // Private: 192.168.0.0/16
    if (a === 169 && b === 254) return true; // Link-local / cloud metadata: 169.254.0.0/16
    if (a === 0) return true;       // Current network: 0.0.0.0/8
    return false;
  }

  if (net.isIPv6(normalizedIp)) {
    const lower = normalizedIp.toLowerCase();
    if (lower === "::1") return true;
    if (lower === "::") return true;
    if (lower.startsWith("fe80:")) return true;
    if (lower.startsWith("fc") || lower.startsWith("fd")) return true;
    return false;
  }

  return true; // Unknown format — block to be safe
}

/**
 * Validate a URL for SSRF safety: resolve DNS and check all IPs.
 * Throws an error if the URL targets a private/reserved address.
 */
export async function validateUrlForSsrf(urlStr: string): Promise<void> {
  const parsed = new URL(urlStr);

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error(`Blocked: unsupported protocol "${parsed.protocol}"`);
  }

  const hostname = parsed.hostname;

  if (net.isIP(hostname)) {
    if (isPrivateIp(hostname)) {
      throw new Error(`Blocked: cannot fetch private/reserved IP address`);
    }
    return;
  }

  let addresses: string[];
  try {
    const results = await dns.resolve(hostname);
    let v6: string[] = [];
    try {
      v6 = await dns.resolve6(hostname);
    } catch {
      // No AAAA records is fine
    }
    addresses = [...results, ...v6];
  } catch {
    throw new Error(`DNS resolution failed for "${hostname}"`);
  }

  if (addresses.length === 0) {
    throw new Error(`No DNS records found for "${hostname}"`);
  }

  for (const addr of addresses) {
    if (isPrivateIp(addr)) {
      throw new Error(`Blocked: "${hostname}" resolves to private/reserved IP`);
    }
  }
}
