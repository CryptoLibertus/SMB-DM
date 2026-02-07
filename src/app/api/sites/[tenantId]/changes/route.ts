import { NextRequest, NextResponse } from "next/server";
import { success, error } from "@/types";
import { db } from "@/lib/db";
import { changeRequests, sites } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { handleApiError } from "@/lib/errors";
import { createChangeRequest } from "@/features/content/change-request";
import { checkRequestLimit } from "@/features/content/change-limits";
import { z } from "zod/v4";
import { requireTenantAuth } from "@/lib/auth";

// GET /api/sites/[tenantId]/changes — List change requests for tenant
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const { tenantId } = await params;

    const authError = await requireTenantAuth(tenantId);
    if (authError) return authError;

    const [site] = await db
      .select()
      .from(sites)
      .where(eq(sites.tenantId, tenantId))
      .limit(1);

    if (!site) {
      return NextResponse.json(error("Site not found"), { status: 404 });
    }

    const changes = await db
      .select()
      .from(changeRequests)
      .where(eq(changeRequests.siteId, site.id))
      .orderBy(desc(changeRequests.createdAt));

    const limit = await checkRequestLimit(site.id);

    return NextResponse.json(
      success({ changes, monthlyUsage: limit })
    );
  } catch (err) {
    const { message, status } = handleApiError(err);
    return NextResponse.json(error(message), { status });
  }
}

const createChangeSchema = z.object({
  description: z.string().min(10, "Description must be at least 10 characters"),
  attachments: z.array(z.string()).optional().default([]),
});

// POST /api/sites/[tenantId]/changes — Create change request from dashboard
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const { tenantId } = await params;

    const authError = await requireTenantAuth(tenantId);
    if (authError) return authError;

    const body = await req.json();
    const parsed = createChangeSchema.parse(body);

    const [site] = await db
      .select()
      .from(sites)
      .where(eq(sites.tenantId, tenantId))
      .limit(1);

    if (!site) {
      return NextResponse.json(error("Site not found"), { status: 404 });
    }

    // Check monthly limit before creating
    const limit = await checkRequestLimit(site.id);
    if (!limit.allowed) {
      return NextResponse.json(
        error(
          `Monthly change request limit reached (${limit.count}/${limit.limit}). ` +
            "Need more updates? Upgrade to our Pro plan."
        ),
        { status: 429 }
      );
    }

    const result = await createChangeRequest(
      site.id,
      "dashboard",
      parsed.description,
      parsed.attachments
    );

    return NextResponse.json(
      success({
        changeRequestId: result.id,
        monthlyRequestNumber: result.monthlyRequestNumber,
        message: "Change request created",
      }),
      { status: 201 }
    );
  } catch (err) {
    const { message, status } = handleApiError(err);
    return NextResponse.json(error(message), { status });
  }
}
