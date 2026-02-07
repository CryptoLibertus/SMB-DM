import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { success, error } from "@/types";
import { handleApiError } from "@/lib/errors";
import {
  getAnalyticsData,
  dateRangeSchema,
} from "@/features/analytics/dashboard";
import { requireTenantAuth } from "@/lib/auth";

// GET /api/analytics/[tenantId] — Fetch analytics data from PostHog
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const { tenantId } = await params;

    const authError = await requireTenantAuth(tenantId);
    if (authError) return authError;

    const tenantIdSchema = z.string().uuid();
    const parsedTenantId = tenantIdSchema.safeParse(tenantId);
    if (!parsedTenantId.success) {
      return NextResponse.json(error("Invalid tenant ID"), { status: 400 });
    }

    const searchParams = req.nextUrl.searchParams;
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    if (!startDate || !endDate) {
      return NextResponse.json(
        error("startDate and endDate query parameters are required"),
        { status: 400 }
      );
    }

    const parsedRange = dateRangeSchema.safeParse({ startDate, endDate });
    if (!parsedRange.success) {
      return NextResponse.json(
        error("Invalid date format. Use YYYY-MM-DD."),
        { status: 400 }
      );
    }

    const data = await getAnalyticsData(parsedTenantId.data, parsedRange.data);
    return NextResponse.json(success(data));
  } catch (err) {
    const { message, status } = handleApiError(err);
    return NextResponse.json(error(message), { status });
  }
}
