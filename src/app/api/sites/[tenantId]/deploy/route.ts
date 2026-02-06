import { NextRequest, NextResponse } from "next/server";
import { success, error } from "@/types";
import { db } from "@/lib/db";
import { sites } from "@/db/schema";
import { eq } from "drizzle-orm";
import { deploySiteVersion } from "@/features/generation/deploy";
import { handleApiError } from "@/lib/errors";

// POST /api/sites/[tenantId]/deploy — Deploy selected version to production
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const { tenantId } = await params;

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

    if (!site.selectedVersionId) {
      return NextResponse.json(
        error("No version selected. Select a version first."),
        { status: 400 }
      );
    }

    // Deploy asynchronously
    const result = await deploySiteVersion(
      site.id,
      site.selectedVersionId,
      "initial"
    );

    // Update site status to provisioning
    await db
      .update(sites)
      .set({ status: "provisioning", updatedAt: new Date() })
      .where(eq(sites.id, site.id));

    return NextResponse.json(
      success({
        tenantId,
        siteId: site.id,
        deploymentId: result.deploymentId,
        deploymentUrl: result.deploymentUrl,
        message: "Deployment started",
      }),
      { status: 202 }
    );
  } catch (err) {
    const { message, status } = handleApiError(err);
    return NextResponse.json(error(message), { status });
  }
}
