import { NextRequest, NextResponse } from "next/server";
import { success, error } from "@/types";
import { handleApiError } from "@/lib/errors";
import { requestRevision } from "@/features/content/change-request";
import { z } from "zod/v4";
import { requireTenantAuth } from "@/lib/auth";

const reviseSchema = z.object({
  feedback: z.string().min(5, "Feedback must be at least 5 characters"),
});

// POST /api/sites/[tenantId]/changes/[id]/revise — Request revision on a change preview
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ tenantId: string; id: string }> }
) {
  try {
    const { tenantId, id } = await params;

    const authError = await requireTenantAuth(tenantId);
    if (authError) return authError;

    const body = await req.json();
    const parsed = reviseSchema.parse(body);

    await requestRevision(id, parsed.feedback);

    return NextResponse.json(
      success({
        tenantId,
        changeId: id,
        message: "Revision requested",
      })
    );
  } catch (err) {
    const { message, status } = handleApiError(err);
    return NextResponse.json(error(message), { status });
  }
}
