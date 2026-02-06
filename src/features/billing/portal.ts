import { stripe } from "@/lib/stripe";

/**
 * Create a Stripe Billing Portal session for self-serve subscription management.
 * Returns the portal session URL the client should redirect to.
 */
export async function createPortalSession(
  stripeCustomerId: string,
  returnUrl: string
): Promise<string> {
  const session = await stripe.billingPortal.sessions.create({
    customer: stripeCustomerId,
    return_url: returnUrl,
  });

  return session.url;
}
