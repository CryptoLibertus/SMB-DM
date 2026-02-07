import { NextRequest, NextResponse } from "next/server";
import { success, error } from "@/types";
import { z } from "zod/v4";
import { v4 as uuidv4 } from "uuid";
import { db } from "@/lib/db";
import { auditResults, sites, siteVersions, tenants } from "@/db/schema";
import { eq } from "drizzle-orm";
import { triggerWorkerGeneration } from "@/features/generation/worker-client";
import { createSiteProject } from "@/features/generation/deploy";
import { DESIGN_DIRECTIVES } from "@/features/generation/types";
import { handleApiError } from "@/lib/errors";
import type { AuditPipelineResult } from "@/features/audit/types";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

export const maxDuration = 60;

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
  aiAnalysis: z
    .object({
      summary: z.string(),
      overallGrade: z.string(),
      findings: z.array(
        z.object({
          category: z.string(),
          severity: z.enum(["critical", "warning", "info"]),
          title: z.string(),
          detail: z.string(),
          recommendation: z.string(),
        })
      ),
      topPriorities: z.array(z.string()),
    })
    .nullable()
    .optional(),
  demoSessionId: z.uuid().optional(),
});

// POST /api/generate — Create DB records, then trigger Fly.io worker
export async function POST(req: NextRequest) {
  try {
    // Rate limit: 3 per IP per 10 minutes
    const ip = getClientIp(req);
    const rateLimitError = await rateLimit(`generate:${ip}`, 3, 600);
    if (rateLimitError) return rateLimitError;

    const body = await req.json();
    const parsed = GenerateRequestSchema.parse(body);

    const generationId = uuidv4();

    // 1. Look up audit result
    const [auditResult] = await db
      .select()
      .from(auditResults)
      .where(eq(auditResults.id, parsed.auditResultId))
      .limit(1);

    if (!auditResult) {
      return NextResponse.json(
        error("Audit result not found"),
        { status: 404 }
      );
    }

    // 2. Find or create tenant
    let tenantId = auditResult.tenantId;
    if (!tenantId) {
      const [tenant] = await db
        .insert(tenants)
        .values({
          businessName: parsed.businessContext.businessName,
          contactEmail: parsed.businessContext.contactEmail,
          phone: parsed.businessContext.phone,
          industry: parsed.businessContext.industry,
          services: parsed.businessContext.services,
          locations: parsed.businessContext.locations,
          targetKeywords: parsed.businessContext.targetKeywords,
        })
        .returning();
      tenantId = tenant.id;

      await db
        .update(auditResults)
        .set({ tenantId })
        .where(eq(auditResults.id, parsed.auditResultId));
    }

    // 3. Find existing site or create new one
    const [existingSite] = await db
      .select()
      .from(sites)
      .where(eq(sites.tenantId, tenantId))
      .limit(1);

    let site;
    if (existingSite) {
      // Re-generation: update the existing site's generationId
      const [updated] = await db
        .update(sites)
        .set({ generationId, status: "demo", updatedAt: new Date() })
        .where(eq(sites.id, existingSite.id))
        .returning();
      site = updated;
    } else {
      const vercelProjectId = await createSiteProject(
        tenantId,
        parsed.businessContext.businessName
      );
      const [created] = await db
        .insert(sites)
        .values({
          tenantId,
          vercelProjectId,
          generationId,
          previewDomain: `preview-${tenantId.slice(0, 8)}.vercel.app`,
          status: "demo",
        })
        .returning();
      site = created;
    }

    // 4. Create 1 SiteVersion record
    const directive = DESIGN_DIRECTIVES[0];
    const [versionRecord] = await db
      .insert(siteVersions)
      .values({
        siteId: site.id,
        versionNumber: directive.versionNumber,
        generatedCodeRef: "",
        previewUrl: "",
        designMeta: {
          colorPalette: directive.colorPalette,
          layoutType: directive.layoutType,
          typography: directive.typography,
        },
        status: "generating",
      })
      .returning();

    // 5. Build audit data for worker
    const auditData: AuditPipelineResult = {
      seoScore: auditResult.seoScore,
      mobileScore: auditResult.mobileScore,
      ctaAnalysis: auditResult.ctaAnalysis as AuditPipelineResult["ctaAnalysis"],
      metaTags: auditResult.metaTags,
      analyticsDetected: auditResult.analyticsDetected,
      dnsInfo: auditResult.dnsInfo,
      extractedImages: auditResult.extractedImages as AuditPipelineResult["extractedImages"],
      screenshotDesktop: auditResult.screenshotDesktop,
      screenshotMobile: auditResult.screenshotMobile,
    };

    // 6. Read AI analysis from request body or fall back to DB
    const aiAnalysis = parsed.aiAnalysis ?? auditResult.aiAnalysis ?? null;

    // 7. Trigger Fly.io worker (fire-and-forget)
    try {
      await triggerWorkerGeneration({
        generationId,
        siteId: site.id,
        versions: [
          {
            siteVersionId: versionRecord.id,
            versionNumber: directive.versionNumber,
            directive,
          },
        ],
        businessContext: parsed.businessContext,
        auditData,
        aiAnalysis,
      });
    } catch (workerErr) {
      console.error("Failed to trigger worker:", workerErr);
      // Mark version as failed if worker is unreachable
      await db
        .update(siteVersions)
        .set({ status: "failed" })
        .where(eq(siteVersions.id, versionRecord.id));
      return NextResponse.json(
        error("Generation service unavailable. Please try again later."),
        { status: 503 }
      );
    }

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
