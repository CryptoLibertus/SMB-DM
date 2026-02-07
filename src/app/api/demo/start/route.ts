import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { db } from "@/lib/db";
import { demoSessions } from "@/db/schema";
import { success, error } from "@/types";
import { randomUUID } from "crypto";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

const schema = z.object({
  email: z.email(),
});

// POST /api/demo/start — Capture email, create demoSession
export async function POST(req: NextRequest) {
  try {
    // Rate limit: 10 per IP per minute
    const ip = getClientIp(req);
    const rateLimitError = await rateLimit(`demo:${ip}`, 10, 60);
    if (rateLimitError) return rateLimitError;

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        error("Please provide a valid email address."),
        { status: 400 }
      );
    }

    const { email } = parsed.data;

    // Rate limit per email: 3 per hour
    const emailRateLimitError = await rateLimit(`demo:email:${email.toLowerCase()}`, 3, 3600);
    if (emailRateLimitError) return emailRateLimitError;

    const [session] = await db
      .insert(demoSessions)
      .values({
        contactEmail: email,
        sourceType: "live_demo",
        status: "active",
        token: randomUUID(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      })
      .returning({ id: demoSessions.id });

    return NextResponse.json(success({ demoSessionId: session.id }));
  } catch (err) {
    console.error("Failed to create demo session:", err);
    return NextResponse.json(error("Failed to start demo"), { status: 500 });
  }
}
