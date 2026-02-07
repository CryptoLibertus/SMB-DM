import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { success, error } from "@/types";
import { createPortalSession } from "@/features/billing/portal";
import { handleApiError } from "@/lib/errors";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { subscriptions, tenants } from "@/db/schema";
import { eq } from "drizzle-orm";

const portalSchema = z.object({
  stripeCustomerId: z.string().min(1),
  returnUrl: z.string().url(),
});

// POST /api/billing/portal — Create Stripe Billing Portal session
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(error("Authentication required"), { status: 401 });
    }

    const body = await req.json();
    const parsed = portalSchema.parse(body);

    // Verify the caller owns the subscription with this stripeCustomerId
    const [sub] = await db
      .select({ tenantId: subscriptions.tenantId })
      .from(subscriptions)
      .where(eq(subscriptions.stripeCustomerId, parsed.stripeCustomerId))
      .limit(1);

    if (!sub) {
      return NextResponse.json(error("Subscription not found"), { status: 404 });
    }

    const [tenant] = await db
      .select({ ownerUserId: tenants.ownerUserId, contactEmail: tenants.contactEmail })
      .from(tenants)
      .where(eq(tenants.id, sub.tenantId))
      .limit(1);

    if (!tenant) {
      return NextResponse.json(error("Tenant not found"), { status: 404 });
    }

    const isOwner =
      tenant.ownerUserId === session.user.id ||
      (!tenant.ownerUserId &&
        session.user.email &&
        tenant.contactEmail.toLowerCase() === session.user.email.toLowerCase());

    if (!isOwner) {
      return NextResponse.json(error("Forbidden"), { status: 403 });
    }

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
