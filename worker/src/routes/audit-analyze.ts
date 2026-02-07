import { Router } from "express";
import { z } from "zod";
import { authMiddleware } from "../lib/auth.js";
import { runAuditAnalysis } from "../agent/run-audit-analysis.js";
import type { AuditAnalyzeRequest } from "../types/audit-analysis.js";

const router = Router();

const auditAnalyzeSchema = z.object({
  auditId: z.string().uuid(),
  targetUrl: z.string().url(),
  basicAuditData: z.object({
    seoScore: z.number(),
    mobileScore: z.number(),
    ctaAnalysis: z.object({
      elements: z.array(
        z.object({
          type: z.string(),
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
  }),
});

router.post("/audit-analyze", authMiddleware, async (req, res) => {
  const parsed = auditAnalyzeSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({
      error: "Invalid request body",
      details: parsed.error.issues,
    });
    return;
  }

  const analyzeRequest: AuditAnalyzeRequest = parsed.data;

  console.log(
    `[api] Received audit analysis request for audit ${analyzeRequest.auditId} (${analyzeRequest.targetUrl})`
  );

  // Return 202 immediately — analysis runs in background, updating DB as it goes.
  res.status(202).json({
    accepted: true,
    auditId: analyzeRequest.auditId,
  });

  // Run analysis in background (don't await in request handler)
  runAuditAnalysis(analyzeRequest)
    .then(() => {
      console.log(
        `[api] Audit analysis ${analyzeRequest.auditId} completed`
      );
    })
    .catch((err) => {
      const message = err instanceof Error ? err.message : "Unknown error";
      console.error(
        `[api] Audit analysis ${analyzeRequest.auditId} failed:`,
        message
      );
    });
});

export default router;
