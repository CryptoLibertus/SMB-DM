import { NextRequest, NextResponse } from "next/server";
import { success, error } from "@/types";
import { handleApiError } from "@/lib/errors";
import { approveChange } from "@/features/content/change-request";
import { requireTenantAuth } from "@/lib/auth";

// POST /api/sites/[tenantId]/changes/[id]/approve — Approve and deploy a change
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ tenantId: string; id: string }> }
) {
  try {
    const { tenantId, id } = await params;

    const authError = await requireTenantAuth(tenantId);
    if (authError) return authError;

    await approveChange(id);

    return NextResponse.json(
      success({
        tenantId,
        changeId: id,
        message: "Change approved and deploying",
      })
    );
  } catch (err) {
    const { message, status } = handleApiError(err);
    return NextResponse.json(error(message), { status });
  }
}
