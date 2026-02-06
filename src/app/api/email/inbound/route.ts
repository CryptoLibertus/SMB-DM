import { NextRequest, NextResponse } from "next/server";
import { success, error } from "@/types";
import { handleApiError } from "@/lib/errors";
import { processInboundEmail } from "@/features/content/email-inbound";

// POST /api/email/inbound — Receive inbound email from SendGrid
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    const result = await processInboundEmail(formData);

    return NextResponse.json(
      success({
        status: result.status,
        changeRequestIds: result.changeRequestIds,
      })
    );
  } catch (err) {
    const { message, status } = handleApiError(err);
    return NextResponse.json(error(message), { status });
  }
}
