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
  demoSessionId: z.uuid().optional(),
});

// POST /api/generate — Create DB records, then trigger Fly.io worker
export async function POST(req: NextRequest) {
  try {
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

    // 3. Create real Vercel project, then create site record
    const vercelProjectId = await createSiteProject(
      tenantId,
      parsed.businessContext.businessName
    );

    const [site] = await db
      .insert(sites)
      .values({
        tenantId,
        vercelProjectId,
        generationId,
        previewDomain: `preview-${tenantId.slice(0, 8)}.vercel.app`,
        status: "demo",
      })
      .returning();

    // 4. Create 3 SiteVersion records
    const versionRecords = await Promise.all(
      DESIGN_DIRECTIVES.map((directive) =>
        db
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
          .returning()
          .then((rows) => rows[0])
      )
    );

    // 5. Build audit data for worker
    const auditData: AuditPipelineResult = {
      seoScore: auditResult.seoScore,
      mobileScore: auditResult.mobileScore,
      ctaAnalysis: auditResult.ctaAnalysis as AuditPipelineResult["ctaAnalysis"],
      metaTags: auditResult.metaTags,
      analyticsDetected: auditResult.analyticsDetected,
      dnsInfo: auditResult.dnsInfo,
      screenshotDesktop: auditResult.screenshotDesktop,
      screenshotMobile: auditResult.screenshotMobile,
    };

    // 6. Trigger Fly.io worker (fire-and-forget)
    try {
      await triggerWorkerGeneration({
        generationId,
        siteId: site.id,
        versions: DESIGN_DIRECTIVES.map((directive, index) => ({
          siteVersionId: versionRecords[index].id,
          versionNumber: directive.versionNumber,
          directive,
        })),
        businessContext: parsed.businessContext,
        auditData,
      });
    } catch (workerErr) {
      console.error("Failed to trigger worker:", workerErr);
      // Mark all versions as failed if worker is unreachable
      await Promise.all(
        versionRecords.map((v) =>
          db
            .update(siteVersions)
            .set({ status: "failed" })
            .where(eq(siteVersions.id, v.id))
        )
      );
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
