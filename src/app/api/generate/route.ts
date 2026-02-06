import { NextRequest, NextResponse, after } from "next/server";
import { success, error } from "@/types";
import { z } from "zod/v4";
import { v4 as uuidv4 } from "uuid";
import { runGenerationPipeline } from "@/features/generation/pipeline";
import { handleApiError } from "@/lib/errors";

export const maxDuration = 300;

const GenerateRequestSchema = z.object({
  auditResultId: z.uuid(),
  businessContext: z.object({
    businessName: z.string().min(1),
    industry: z.string().min(1),
    services: z.array(z.string()),
    locations: z.array(z.string()),
    phone: z.string().nullable(),
    contactEmail: z.email(),
    targetKeywords: z.array(z.string()),
  }),
  demoSessionId: z.uuid().optional(),
});

// POST /api/generate — Start 3-version generation pipeline
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = GenerateRequestSchema.parse(body);

    const generationId = uuidv4();

    // Run pipeline after response — after() keeps the serverless function alive
    after(async () => {
      try {
        await runGenerationPipeline(
          generationId,
          parsed.auditResultId,
          parsed.businessContext
        );
      } catch (err) {
        console.error(`Generation pipeline ${generationId} failed:`, err);
      }
    });

    return NextResponse.json(
      success({ generationId, message: "Generation started" }),
      { status: 202 }
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
