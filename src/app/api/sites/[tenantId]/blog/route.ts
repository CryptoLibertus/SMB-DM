import { NextRequest, NextResponse } from "next/server";
import { success, error } from "@/types";
import { db } from "@/lib/db";
import { blogPosts, sites, tenants } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { handleApiError } from "@/lib/errors";
import { generateBlogPost } from "@/features/content/blog-generation";
import { z } from "zod/v4";
import { requireTenantAuth } from "@/lib/auth";

// GET /api/sites/[tenantId]/blog — List blog posts (status, schedule)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const { tenantId } = await params;

    const authError = await requireTenantAuth(tenantId);
    if (authError) return authError;

    const [site] = await db
      .select()
      .from(sites)
      .where(eq(sites.tenantId, tenantId))
      .limit(1);

    if (!site) {
      return NextResponse.json(error("Site not found"), { status: 404 });
    }

    const posts = await db
      .select()
      .from(blogPosts)
      .where(eq(blogPosts.siteId, site.id))
      .orderBy(desc(blogPosts.scheduledFor));

    return NextResponse.json(success({ posts }));
  } catch (err) {
    const { message, status } = handleApiError(err);
    return NextResponse.json(error(message), { status });
  }
}

const generateBlogSchema = z.object({
  topic: z.string().min(5, "Topic must be at least 5 characters"),
});

// POST /api/sites/[tenantId]/blog — Trigger manual blog post generation
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const { tenantId } = await params;

    const authError = await requireTenantAuth(tenantId);
    if (authError) return authError;

    const body = await req.json();
    const parsed = generateBlogSchema.parse(body);

    const [site] = await db
      .select()
      .from(sites)
      .where(eq(sites.tenantId, tenantId))
      .limit(1);

    if (!site) {
      return NextResponse.json(error("Site not found"), { status: 404 });
    }

    const [tenant] = await db
      .select()
      .from(tenants)
      .where(eq(tenants.id, tenantId))
      .limit(1);

    if (!tenant) {
      return NextResponse.json(error("Tenant not found"), { status: 404 });
    }

    const postId = await generateBlogPost(site.id, parsed.topic, {
      businessName: tenant.businessName,
      industry: tenant.industry,
      services: tenant.services,
      locations: tenant.locations,
      targetKeywords: tenant.targetKeywords,
    });

    return NextResponse.json(
      success({ postId, message: "Blog post generation started" }),
      { status: 202 }
    );
  } catch (err) {
    const { message, status } = handleApiError(err);
    return NextResponse.json(error(message), { status });
  }
}
