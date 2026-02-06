import { NextRequest, NextResponse } from "next/server";
import { success, error } from "@/types";

// POST /api/demo/[token]/handoff — Send follow-up link via SMS or email
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const body = await req.json();
    // TODO: Send demo link to provided email/phone via Resend
    return NextResponse.json(success({ token, message: "Follow-up link sent" }));
  } catch (err) {
    return NextResponse.json(error("Failed to send follow-up"), { status: 500 });
  }
}
