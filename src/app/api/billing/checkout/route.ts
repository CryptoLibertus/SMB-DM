import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { success, error } from "@/types";
import { createCheckoutSession } from "@/features/billing/checkout";
import { handleApiError } from "@/lib/errors";

const checkoutSchema = z.object({
  tenantId: z.string().uuid(),
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
});

// POST /api/billing/checkout — Create Stripe Checkout session
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = checkoutSchema.parse(body);

    const url = await createCheckoutSession(
      parsed.tenantId,
      parsed.successUrl,
      parsed.cancelUrl
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
