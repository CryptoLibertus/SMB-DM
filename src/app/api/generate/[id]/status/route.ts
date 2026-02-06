import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sites, siteVersions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { success, error } from "@/types";

export const maxDuration = 60;

// GET /api/generate/[id]/status — Poll for generation progress
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: generationId } = await params;

  // Find the site by generationId
  const [site] = await db
    .select()
    .from(sites)
    .where(eq(sites.generationId, generationId))
    .limit(1);

  if (!site) {
    // Site not created yet — pipeline is still initializing
    return NextResponse.json(
      success({
        stage: "initializing",
        isComplete: false,
        versions: [],
      })
    );
  }

  // Get all versions for this site
  const versions = await db
    .select()
    .from(siteVersions)
    .where(eq(siteVersions.siteId, site.id));

  // Determine stage from version statuses
  const readyCount = versions.filter((v) => v.status === "ready").length;
  const failedCount = versions.filter((v) => v.status === "failed").length;
  const generatingCount = versions.filter((v) => v.status === "generating").length;
  const isComplete = generatingCount === 0 && versions.length > 0;

  let stage = "generating";
  if (isComplete) {
    stage = readyCount > 0 ? "complete" : "error";
  }

  return NextResponse.json(
    success({
      stage,
      isComplete,
      readyCount,
      failedCount,
      versions: versions.map((v) => ({
        id: v.id,
        versionNumber: v.versionNumber,
        status: v.status,
        previewUrl: v.previewUrl || null,
        designMeta: v.designMeta,
      })),
    })
  );
}
