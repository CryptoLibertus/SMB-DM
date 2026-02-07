import { NextRequest, NextResponse } from "next/server";
import { success, error } from "@/types";
import { z } from "zod/v4";
import { db } from "@/lib/db";
import { siteVersions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { deploySiteVersion } from "@/features/generation/deploy";
import { handleApiError } from "@/lib/errors";
import { timingSafeEqual } from "crypto";

function timingSafeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    timingSafeEqual(bufA, bufA);
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}

export const maxDuration = 120;

const DeployRequestSchema = z.object({
  siteId: z.uuid(),
  siteVersionId: z.uuid(),
});

// POST /api/internal/deploy-version — Worker callback to deploy a generated version
export async function POST(req: NextRequest) {
  try {
    // Verify auth
    const authHeader = req.headers.get("authorization");
    const expectedSecret = process.env.WORKER_AUTH_SECRET;

    if (!expectedSecret) {
      return NextResponse.json(
        error("Server misconfigured"),
        { status: 500 }
      );
    }

    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : "";
    if (!token || !timingSafeCompare(token, expectedSecret)) {
      return NextResponse.json(
        error("Unauthorized"),
        { status: 401 }
      );
    }

    const body = await req.json();
    const parsed = DeployRequestSchema.parse(body);

    // Verify the version exists and is ready
    const [version] = await db
      .select()
      .from(siteVersions)
      .where(eq(siteVersions.id, parsed.siteVersionId))
      .limit(1);

    if (!version) {
      return NextResponse.json(
        error("Site version not found"),
        { status: 404 }
      );
    }

    if (version.status !== "ready") {
      return NextResponse.json(
        error(`Version is not ready (status: ${version.status})`),
        { status: 400 }
      );
    }

    if (!version.generatedCodeRef) {
      return NextResponse.json(
        error("Version has no generated code reference"),
        { status: 400 }
      );
    }

    // Deploy to Vercel
    const { deploymentId, deploymentUrl } = await deploySiteVersion(
      parsed.siteId,
      parsed.siteVersionId,
      "initial"
    );

    // Update previewUrl on the version record
    const previewUrl = `https://${deploymentUrl}`;
    await db
      .update(siteVersions)
      .set({ previewUrl })
      .where(eq(siteVersions.id, parsed.siteVersionId));

    return NextResponse.json(
      success({ previewUrl, deploymentId })
    );
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        error(`Validation error: ${err.message}`),
        { status: 400 }
      );
    }
    console.error("[deploy-version] Error:", err);
    const { message, status } = handleApiError(err);
    return NextResponse.json(error(message), { status });
  }
}
