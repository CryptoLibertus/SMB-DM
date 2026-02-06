import { NextRequest, NextResponse } from "next/server";
import { success, error } from "@/types";

// GET /api/onboarding/[token] — Load personalized demo/onboarding page data
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    // TODO: Look up DemoSession by token, return audit data + versions
    return NextResponse.json(success({ token, status: "active" }));
  } catch (err) {
    return NextResponse.json(error("Failed to load onboarding data"), { status: 500 });
  }
}
