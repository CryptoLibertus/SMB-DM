import { NextRequest, NextResponse } from "next/server";
import { success, error } from "@/types";
import { handleApiError } from "@/lib/errors";
import { processInboundEmail } from "@/features/content/email-inbound";
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

// POST /api/email/inbound — Receive inbound email from SendGrid
// Configure SendGrid Inbound Parse with URL: /api/email/inbound?secret=<SENDGRID_WEBHOOK_SECRET>
export async function POST(req: NextRequest) {
  try {
    // Verify webhook secret (query parameter approach for SendGrid Inbound Parse)
    const webhookSecret = process.env.SENDGRID_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error("SENDGRID_WEBHOOK_SECRET is not configured");
      return NextResponse.json(error("Server misconfigured"), { status: 500 });
    }

    const providedSecret = req.nextUrl.searchParams.get("secret") ?? "";
    if (!providedSecret || !timingSafeCompare(providedSecret, webhookSecret)) {
      return NextResponse.json(error("Unauthorized"), { status: 401 });
    }

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
