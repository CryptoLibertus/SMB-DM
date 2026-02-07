import { NextRequest, NextResponse } from "next/server";
import { success, error } from "@/types";
import { db } from "@/lib/db";
import { sites } from "@/db/schema";
import { eq } from "drizzle-orm";
import { rollbackDeployment } from "@/features/generation/deploy";
import { handleApiError } from "@/lib/errors";
import { requireTenantAuth } from "@/lib/auth";

// POST /api/sites/[tenantId]/rollback — Rollback to previous deployment
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const { tenantId } = await params;

    const authError = await requireTenantAuth(tenantId);
    if (authError) return authError;

    // Get site for tenant
    const [site] = await db
      .select()
      .from(sites)
      .where(eq(sites.tenantId, tenantId))
      .limit(1);

    if (!site) {
      return NextResponse.json(error("Site not found for tenant"), {
        status: 404,
      });
    }

    const result = await rollbackDeployment(site.id);

    return NextResponse.json(
      success({
        tenantId,
        siteId: site.id,
        deploymentId: result.deploymentId,
        deploymentUrl: result.deploymentUrl,
        message: "Rollback started",
      }),
      { status: 202 }
    );
  } catch (err) {
    const { message, status } = handleApiError(err);
    return NextResponse.json(error(message), { status });
  }
}
