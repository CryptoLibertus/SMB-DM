import { Router } from "express";
import { z } from "zod";
import { authMiddleware } from "../lib/auth.js";
import { runGeneration } from "../agent/run-generation.js";
import type { GenerateRequest } from "../types/api.js";

const router = Router();

const directiveSchema = z.object({
  versionNumber: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  name: z.string(),
  description: z.string(),
  colorPalette: z.array(z.string()),
  layoutType: z.string(),
  typography: z.string(),
});

const generateRequestSchema = z.object({
  generationId: z.string().uuid(),
  siteId: z.string().uuid(),
  versions: z
    .array(
      z.object({
        siteVersionId: z.string().uuid(),
        versionNumber: z.union([z.literal(1), z.literal(2), z.literal(3)]),
        directive: directiveSchema,
      })
    )
    .min(1)
    .max(3),
  businessContext: z.object({
    businessName: z.string(),
    industry: z.string(),
    services: z.array(z.string()),
    locations: z.array(z.string()),
    phone: z.string().nullable(),
    contactEmail: z.string().email(),
    targetKeywords: z.array(z.string()),
  }),
  auditData: z
    .object({
      seoScore: z.number(),
      mobileScore: z.number(),
      ctaAnalysis: z.object({
        elements: z.array(
          z.object({
            type: z.enum([
              "phone",
              "tel_link",
              "contact_form",
              "mailto",
              "cta_button",
            ]),
            text: z.string(),
            location: z.string(),
          })
        ),
      }),
      metaTags: z.object({
        title: z.string().nullable(),
        description: z.string().nullable(),
        h1s: z.array(z.string()),
        robots: z.string().nullable(),
      }),
      analyticsDetected: z.object({
        ga4: z.boolean(),
        gtm: z.boolean(),
        other: z.array(z.string()),
      }),
      dnsInfo: z.object({
        registrar: z.string().nullable(),
        nameservers: z.array(z.string()),
        switchable: z.boolean(),
      }),
      screenshotDesktop: z.string().nullable(),
      screenshotMobile: z.string().nullable(),
    })
    .nullable(),
});

router.post("/generate", authMiddleware, async (req, res) => {
  const parsed = generateRequestSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({
      error: "Invalid request body",
      details: parsed.error.issues,
    });
    return;
  }

  const generateRequest: GenerateRequest = parsed.data;

  console.log(
    `[api] Received generation request ${generateRequest.generationId} for site ${generateRequest.siteId}`
  );

  // Run generation synchronously — the Vercel side fires and doesn't wait.
  // The worker runs until all versions are done, updating the DB along the way.
  try {
    const response = await runGeneration(generateRequest);

    console.log(
      `[api] Generation ${generateRequest.generationId} completed in ${response.totalDurationMs}ms`
    );

    res.json(response);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(
      `[api] Generation ${generateRequest.generationId} failed:`,
      message
    );

    res.status(500).json({
      error: "Generation failed",
      message,
      generationId: generateRequest.generationId,
    });
  }
});

export default router;
