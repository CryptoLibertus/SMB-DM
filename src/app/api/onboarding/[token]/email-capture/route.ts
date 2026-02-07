import { NextRequest, NextResponse } from "next/server";
import { success, error } from "@/types";
import { z } from "zod/v4";
import { db } from "@/lib/db";
import { demoSessions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { handleApiError } from "@/lib/errors";

const EmailCaptureSchema = z.object({
  email: z.email(),
});

// POST /api/onboarding/[token]/email-capture — Capture email for async notification
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const body = await req.json();
    const { email } = EmailCaptureSchema.parse(body);

    // Find demo session by token
    const [session] = await db
      .select()
      .from(demoSessions)
      .where(eq(demoSessions.token, token))
      .limit(1);

    if (!session) {
      return NextResponse.json(error("Demo session not found"), {
        status: 404,
      });
    }

    if (session.status === "expired" || session.expiresAt < new Date()) {
      return NextResponse.json(error("Demo session has expired"), {
        status: 410,
      });
    }

    // Save email to demo session
    await db
      .update(demoSessions)
      .set({ contactEmail: email })
      .where(eq(demoSessions.id, session.id));

    return NextResponse.json(
      success({
        token,
        email,
        message: "We'll notify you when your sites are ready",
      })
    );
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        error(`Validation error: ${err.message}`),
        { status: 400 }
      );
    }
    const { message, status } = handleApiError(err);
    return NextResponse.json(error(message), { status });
  }
}
