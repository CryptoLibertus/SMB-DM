import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { success, error } from "@/types";
import { handleApiError, ValidationError } from "@/lib/errors";
import { db } from "@/lib/db";
import { tenants } from "@/db/schema";
import { eq } from "drizzle-orm";
import { generateWeeklyReport, generateMonthlyReport } from "@/features/analytics/reports";
import { sendWeeklyReport, sendMonthlyReport } from "@/features/analytics/report-emails";

const reportRequestSchema = z.object({
  type: z.enum(["weekly", "monthly"]),
});

// POST /api/analytics/[tenantId]/report — Generate and send email report
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const { tenantId } = await params;

    const tenantIdSchema = z.string().uuid();
    const parsedTenantId = tenantIdSchema.safeParse(tenantId);
    if (!parsedTenantId.success) {
      return NextResponse.json(error("Invalid tenant ID"), { status: 400 });
    }

    const body = await req.json();
    const parsedBody = reportRequestSchema.safeParse(body);
    if (!parsedBody.success) {
      return NextResponse.json(
        error("Invalid request body. Provide { type: 'weekly' | 'monthly' }"),
        { status: 400 }
      );
    }

    // Fetch tenant info for the email
    const [tenant] = await db
      .select({
        id: tenants.id,
        businessName: tenants.businessName,
        contactEmail: tenants.contactEmail,
      })
      .from(tenants)
      .where(eq(tenants.id, parsedTenantId.data))
      .limit(1);

    if (!tenant) {
      throw new ValidationError("Tenant not found");
    }

    const { type } = parsedBody.data;

    if (type === "weekly") {
      const report = await generateWeeklyReport(tenant.id);
      await sendWeeklyReport(tenant, report);
      return NextResponse.json(
        success({ reportId: report.id, message: "Weekly report generated and sent" })
      );
    } else {
      const report = await generateMonthlyReport(tenant.id);
      await sendMonthlyReport(tenant, report);
      return NextResponse.json(
        success({ reportId: report.id, message: "Monthly report generated and sent" })
      );
    }
  } catch (err) {
    const { message, status } = handleApiError(err);
    return NextResponse.json(error(message), { status });
  }
}
