import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { handleWebhookEvent } from "@/features/billing/webhook";

// POST /api/billing/webhook — Handle Stripe webhook events
export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const signature = req.headers.get("stripe-signature");

    if (!signature) {
      return NextResponse.json(
        { error: "Missing stripe-signature header" },
        { status: 400 }
      );
    }

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error("STRIPE_WEBHOOK_SECRET is not set");
      return NextResponse.json(
        { error: "Webhook secret not configured" },
        { status: 500 }
      );
    }

    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);

    await handleWebhookEvent(event);

    return NextResponse.json({ received: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Webhook handler failed";
    console.error("Webhook error:", message);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
