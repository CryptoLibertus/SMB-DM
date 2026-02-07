import NextAuth from "next-auth";
import type { NextAuthOptions, DefaultSession } from "next-auth";
import { getServerSession } from "next-auth";
import EmailProvider from "next-auth/providers/email";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "./db";
import { tenants } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { error } from "@/types";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"];
  }
}

export const authOptions: NextAuthOptions = {
  adapter: DrizzleAdapter(db) as NextAuthOptions["adapter"],
  providers: [
    EmailProvider({
      server: {
        host: process.env.EMAIL_SERVER_HOST,
        port: Number(process.env.EMAIL_SERVER_PORT),
        auth: {
          user: process.env.EMAIL_SERVER_USER,
          pass: process.env.EMAIL_SERVER_PASSWORD,
        },
      },
      from: process.env.EMAIL_FROM || "noreply@platform.com",
    }),
  ],
  pages: {
    signIn: "/login",
    verifyRequest: "/check-email",
  },
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
};

export default NextAuth(authOptions);

/**
 * Verify the caller is authenticated and owns the given tenant.
 *
 * Checks:
 * 1. Valid NextAuth session exists
 * 2. Tenant exists
 * 3. Session user owns the tenant (via ownerUserId, or contactEmail fallback)
 *
 * On first match by email, backfills ownerUserId for future lookups.
 *
 * Returns `null` if authorized, or a NextResponse error to return early.
 */
export async function requireTenantAuth(
  tenantId: string
): Promise<NextResponse | null> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json(error("Authentication required"), { status: 401 });
  }

  const [tenant] = await db
    .select({
      id: tenants.id,
      ownerUserId: tenants.ownerUserId,
      contactEmail: tenants.contactEmail,
    })
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1);

  if (!tenant) {
    return NextResponse.json(error("Tenant not found"), { status: 404 });
  }

  // Check direct ownership
  if (tenant.ownerUserId === session.user.id) {
    return null; // Authorized
  }

  // Fallback: match by email (for tenants created before ownerUserId existed)
  if (
    !tenant.ownerUserId &&
    session.user.email &&
    tenant.contactEmail.toLowerCase() === session.user.email.toLowerCase()
  ) {
    // Backfill ownerUserId for future requests
    await db
      .update(tenants)
      .set({ ownerUserId: session.user.id })
      .where(eq(tenants.id, tenantId));
    return null; // Authorized
  }

  return NextResponse.json(error("Forbidden"), { status: 403 });
}
