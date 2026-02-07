import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { success, error } from "@/types";
import { verifyDnsPropagation } from "@/features/billing/dns";
import { handleApiError } from "@/lib/errors";

const verifySchema = z.object({
  domain: z.string().min(1),
});

// POST /api/dns/verify — Check DNS propagation status
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = verifySchema.parse(body);

    const result = await verifyDnsPropagation(parsed.domain);

    return NextResponse.json(success(result));
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
