import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { success, error } from "@/types";
import { attachDomainToSite, verifyDnsPropagation } from "@/features/billing/dns";
import { handleApiError } from "@/lib/errors";
import { requireTenantAuth } from "@/lib/auth";

const domainSchema = z.object({
  domain: z.string().min(1),
});

// POST /api/sites/[tenantId]/domain — Attach custom domain to Vercel project
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const { tenantId } = await params;

    const authError = await requireTenantAuth(tenantId);
    if (authError) return authError;

    const body = await req.json();
    const parsed = domainSchema.parse(body);

    // Attach domain to the site's Vercel project
    await attachDomainToSite(tenantId, parsed.domain);

    // Run initial DNS verification
    const dnsResult = await verifyDnsPropagation(parsed.domain);

    return NextResponse.json(
      success({
        tenantId,
        domain: parsed.domain,
        dnsVerified: dnsResult.verified,
        dnsMessage: dnsResult.message,
      })
    );
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        error("Invalid input: " + err.issues.map((i) => i.message).join(", ")),
        { status: 400 }
      );
    }
    const { message, status } = handleApiError(err);
    return NextResponse.json(error(message), { status });
  }
}
