import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { db } from "@/lib/db";
import { demoSessions } from "@/db/schema";
import { success, error } from "@/types";
import { randomUUID } from "crypto";

const schema = z.object({
  email: z.email(),
});

// POST /api/demo/start — Capture email, create demoSession
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        error("Please provide a valid email address."),
        { status: 400 }
      );
    }

    const { email } = parsed.data;

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
