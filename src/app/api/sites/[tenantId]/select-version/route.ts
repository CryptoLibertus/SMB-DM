import { NextRequest, NextResponse } from "next/server";
import { success, error } from "@/types";
import { z } from "zod/v4";
import { db } from "@/lib/db";
import { sites, siteVersions } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { handleApiError } from "@/lib/errors";

const SelectVersionSchema = z.object({
  versionId: z.uuid(),
});

// POST /api/sites/[tenantId]/select-version — Record which version user picked
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const { tenantId } = await params;
    const body = await req.json();
    const { versionId } = SelectVersionSchema.parse(body);

    // Verify site exists for tenant
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

    // Verify the version belongs to this site and is ready
    const [version] = await db
      .select()
      .from(siteVersions)
      .where(
        and(
          eq(siteVersions.id, versionId),
          eq(siteVersions.siteId, site.id),
          eq(siteVersions.status, "ready")
        )
      )
      .limit(1);

    if (!version) {
      return NextResponse.json(
        error("Version not found, does not belong to this site, or is not ready"),
        { status: 404 }
      );
    }

    // Update site's selected version
    await db
      .update(sites)
      .set({
        selectedVersionId: versionId,
        updatedAt: new Date(),
      })
      .where(eq(sites.id, site.id));

    return NextResponse.json(
      success({ tenantId, siteId: site.id, selectedVersionId: versionId })
    );
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        error(`Validation error: ${err.message}`),
        { status: 400 }
      );
    }
    const { message, status } = handleApiError(err);
    return NextResponse.json(error(message), { status });
  }
}
