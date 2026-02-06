import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { success, error } from "@/types";
import { createPortalSession } from "@/features/billing/portal";
import { handleApiError } from "@/lib/errors";

const portalSchema = z.object({
  stripeCustomerId: z.string().min(1),
  returnUrl: z.string().url(),
});

// POST /api/billing/portal — Create Stripe Billing Portal session
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = portalSchema.parse(body);

    const url = await createPortalSession(
      parsed.stripeCustomerId,
      parsed.returnUrl
    );

    return NextResponse.json(success({ url }));
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        error("Invalid input: " + err.issues.map((i) => i.message).join(", ")),
        { status: 400 }
      );
    }
    const { message, status } = handleApiError(err);
    return NextResponse.json(error(message), { status });
  }
}
