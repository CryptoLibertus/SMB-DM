import { stripe } from "@/lib/stripe";

const PRODUCT_NAME = "SMB-DM Website Refresh & Growth";
const PRICE_AMOUNT = 9995; // $99.95 in cents
const CURRENCY = "usd";

/**
 * Ensure the Stripe Product + Price exist, returning the Price ID.
 * Uses idempotency via lookup_key so repeated calls are safe.
 */
async function getOrCreatePrice(): Promise<string> {
  // Check for existing price with our lookup key
  const existing = await stripe.prices.list({
    lookup_keys: ["smb_dm_monthly"],
    limit: 1,
  });

  if (existing.data.length > 0) {
    return existing.data[0].id;
  }

  // Create the product
  const product = await stripe.products.create({
    name: PRODUCT_NAME,
    description:
      "Live hosted website, 2x weekly blog posts, analytics, dashboard, email reports, and 5 change requests/month.",
  });

  // Create a recurring price
  const price = await stripe.prices.create({
    product: product.id,
    unit_amount: PRICE_AMOUNT,
    currency: CURRENCY,
    recurring: { interval: "month" },
    lookup_key: "smb_dm_monthly",
  });

  return price.id;
}

/**
 * Create a Stripe Checkout session for a tenant.
 * Returns the Checkout session URL the client should redirect to.
 */
export async function createCheckoutSession(
  tenantId: string,
  successUrl: string,
  cancelUrl: string
): Promise<string> {
  const priceId = await getOrCreatePrice();

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: { tenantId },
    subscription_data: {
      metadata: { tenantId },
    },
  });

  if (!session.url) {
    throw new Error("Stripe did not return a checkout session URL");
  }

  return session.url;
}
