import Stripe from "stripe";
import { db } from "@/lib/db";
import { subscriptions, sites, tenants } from "@/db/schema";
import { eq } from "drizzle-orm";
import { deploySiteVersion } from "@/features/generation/deploy";
import { sendWelcomeEmail } from "./onboarding-emails";
import {
  sendPaymentFailedEmail,
  sendCancellationEmail,
} from "./lifecycle-emails";

/**
 * Dispatch a Stripe webhook event to the appropriate handler.
 */
export async function handleWebhookEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case "checkout.session.completed":
      await handleCheckoutCompleted(
        event.data.object as Stripe.Checkout.Session
      );
      break;
    case "invoice.payment_failed":
      await handlePaymentFailed(event.data.object as Stripe.Invoice);
      break;
    case "customer.subscription.deleted":
      await handleSubscriptionDeleted(
        event.data.object as Stripe.Subscription
      );
      break;
    case "customer.subscription.updated":
      await handleSubscriptionUpdated(
        event.data.object as Stripe.Subscription
      );
      break;
    default:
      // Unhandled event type — log and ignore
      console.log(`Unhandled Stripe event type: ${event.type}`);
  }
}

/**
 * checkout.session.completed:
 * - Create Subscription record
 * - Trigger site deployment
 * - Send Day 0 onboarding email
 */
async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session
): Promise<void> {
  const tenantId = session.metadata?.tenantId;
  if (!tenantId) {
    console.error("checkout.session.completed missing tenantId in metadata");
    return;
  }

  const stripeCustomerId =
    typeof session.customer === "string"
      ? session.customer
      : session.customer?.id;
  const stripeSubscriptionId =
    typeof session.subscription === "string"
      ? session.subscription
      : session.subscription?.id;

  if (!stripeCustomerId || !stripeSubscriptionId) {
    console.error("checkout.session.completed missing customer or subscription");
    return;
  }

  // Create Subscription record
  await db.insert(subscriptions).values({
    tenantId,
    stripeCustomerId,
    stripeSubscriptionId,
    status: "active",
    currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // ~30 days from now
  });

  // Trigger site deployment for the selected version
  const [site] = await db
    .select()
    .from(sites)
    .where(eq(sites.tenantId, tenantId))
    .limit(1);

  if (site && site.selectedVersionId) {
    try {
      await deploySiteVersion(site.id, site.selectedVersionId, "initial");
      // Update site status to live
      await db
        .update(sites)
        .set({ status: "live", updatedAt: new Date() })
        .where(eq(sites.id, site.id));
    } catch (err) {
      console.error(`Failed to deploy site for tenant ${tenantId}:`, err);
    }
  }

  // Send Day 0 onboarding email
  const [tenant] = await db
    .select()
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1);

  if (tenant) {
    try {
      await sendWelcomeEmail(tenant);
    } catch (err) {
      console.error(`Failed to send welcome email for tenant ${tenantId}:`, err);
    }
  }
}

/**
 * invoice.payment_failed:
 * - Send grace period email via Resend
 * - Update subscription status to past_due
 */
async function handlePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
  // In Stripe v20 (Clover API), subscription is inside parent.subscription_details
  const subDetails = invoice.parent?.subscription_details;
  const stripeSubscriptionId =
    subDetails
      ? typeof subDetails.subscription === "string"
        ? subDetails.subscription
        : subDetails.subscription?.id
      : undefined;

  if (!stripeSubscriptionId) return;

  // Update subscription to past_due
  const [sub] = await db
    .update(subscriptions)
    .set({ status: "past_due" })
    .where(eq(subscriptions.stripeSubscriptionId, stripeSubscriptionId))
    .returning();

  if (!sub) return;

  // Get tenant and send payment failed email
  const [tenant] = await db
    .select()
    .from(tenants)
    .where(eq(tenants.id, sub.tenantId))
    .limit(1);

  if (tenant) {
    try {
      await sendPaymentFailedEmail(tenant);
    } catch (err) {
      console.error(
        `Failed to send payment failed email for tenant ${sub.tenantId}:`,
        err
      );
    }
  }
}

/**
 * customer.subscription.deleted:
 * - Update subscription status to canceled
 * - Site stays live through currentPeriodEnd
 */
async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription
): Promise<void> {
  // In Stripe v20 (Clover API), current_period_end is removed.
  // Use cancel_at or ended_at as the effective end date.
  const endTimestamp = subscription.cancel_at ?? subscription.ended_at ?? Math.floor(Date.now() / 1000);
  const periodEnd = new Date(endTimestamp * 1000);

  const [sub] = await db
    .update(subscriptions)
    .set({
      status: "canceled",
      canceledAt: new Date(),
      currentPeriodEnd: periodEnd,
    })
    .where(eq(subscriptions.stripeSubscriptionId, subscription.id))
    .returning();

  if (!sub) return;

  // Get tenant and send cancellation email
  const [tenant] = await db
    .select()
    .from(tenants)
    .where(eq(tenants.id, sub.tenantId))
    .limit(1);

  if (tenant) {
    try {
      await sendCancellationEmail(tenant, periodEnd);
    } catch (err) {
      console.error(
        `Failed to send cancellation email for tenant ${sub.tenantId}:`,
        err
      );
    }
  }
}

/**
 * customer.subscription.updated:
 * - Handle reactivation: if status goes back to active, restore last deployment
 */
async function handleSubscriptionUpdated(
  subscription: Stripe.Subscription
): Promise<void> {
  const newStatus = subscription.status;

  // Map Stripe status to our status
  let mappedStatus: "active" | "past_due" | "canceled" | "paused";
  switch (newStatus) {
    case "active":
      mappedStatus = "active";
      break;
    case "past_due":
      mappedStatus = "past_due";
      break;
    case "canceled":
      mappedStatus = "canceled";
      break;
    default:
      mappedStatus = "paused";
  }

  // Compute period end from billing_cycle_anchor (monthly subscription)
  const anchorDate = new Date(subscription.billing_cycle_anchor * 1000);
  const nextPeriodEnd = new Date(anchorDate);
  // Advance to next month boundary from anchor
  while (nextPeriodEnd.getTime() < Date.now()) {
    nextPeriodEnd.setMonth(nextPeriodEnd.getMonth() + 1);
  }

  const [sub] = await db
    .update(subscriptions)
    .set({
      status: mappedStatus,
      currentPeriodEnd: nextPeriodEnd,
    })
    .where(eq(subscriptions.stripeSubscriptionId, subscription.id))
    .returning();

  if (!sub) return;

  // If reactivated (status → active), restore the site
  if (mappedStatus === "active") {
    const [site] = await db
      .select()
      .from(sites)
      .where(eq(sites.tenantId, sub.tenantId))
      .limit(1);

    if (site && site.selectedVersionId) {
      // Check if within 90-day retention window
      const daysSinceCreation =
        (Date.now() - new Date(site.createdAt).getTime()) /
        (1000 * 60 * 60 * 24);

      if (daysSinceCreation <= 90) {
        try {
          await deploySiteVersion(site.id, site.selectedVersionId, "initial");
          await db
            .update(sites)
            .set({ status: "live", updatedAt: new Date() })
            .where(eq(sites.id, site.id));
          await db
            .update(tenants)
            .set({ status: "active", updatedAt: new Date() })
            .where(eq(tenants.id, sub.tenantId));
        } catch (err) {
          console.error(
            `Failed to restore site for tenant ${sub.tenantId}:`,
            err
          );
        }
      }
    }
  }
}
