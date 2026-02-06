import { db } from "@/lib/db";
import { blogPosts, sites, tenants } from "@/db/schema";
import { eq, and, lte, inArray } from "drizzle-orm";
import { generateBlogPost, publishBlogPost, retryFailedPost } from "./blog-generation";
import { generateTopicList } from "./blog-topics";

/**
 * Find all scheduled posts that are due and publish them.
 * Called by a Vercel Cron job.
 */
export async function processScheduledPosts(): Promise<{
  published: number;
  failed: number;
}> {
  const now = new Date();

  const duePosts = await db
    .select()
    .from(blogPosts)
    .where(
      and(
        eq(blogPosts.status, "scheduled"),
        lte(blogPosts.scheduledFor, now)
      )
    );

  let published = 0;
  let failed = 0;

  for (const post of duePosts) {
    try {
      await publishBlogPost(post.id);
      published++;
    } catch {
      failed++;
    }
  }

  return { published, failed };
}

/**
 * Retry all failed posts that haven't exceeded the retry limit.
 */
export async function retryFailedPosts(): Promise<{
  retried: number;
  exhausted: number;
}> {
  const failedPosts = await db
    .select()
    .from(blogPosts)
    .where(eq(blogPosts.status, "failed"));

  let retried = 0;
  let exhausted = 0;

  for (const post of failedPosts) {
    if (post.retryCount >= 3) {
      exhausted++;
      continue;
    }

    const success = await retryFailedPost(post.id);
    if (success) {
      retried++;
    } else {
      exhausted++;
    }
  }

  return { retried, exhausted };
}

/**
 * Schedule 2 blog posts for the upcoming week for a specific site.
 * Generates topics if needed, then creates posts for Tuesday and Thursday.
 */
export async function scheduleWeeklyPosts(siteId: string): Promise<string[]> {
  // Get the site and tenant info
  const [site] = await db
    .select()
    .from(sites)
    .where(eq(sites.id, siteId))
    .limit(1);

  if (!site) throw new Error(`Site ${siteId} not found`);

  const [tenant] = await db
    .select()
    .from(tenants)
    .where(eq(tenants.id, site.tenantId))
    .limit(1);

  if (!tenant) throw new Error(`Tenant ${site.tenantId} not found`);

  // Generate topics for this tenant
  const topics = await generateTopicList({
    businessName: tenant.businessName,
    industry: tenant.industry,
    services: tenant.services,
    locations: tenant.locations,
    targetKeywords: tenant.targetKeywords,
  });

  // Pick the first 2 topics for this week
  const weekTopics = topics.slice(0, 2);
  const postIds: string[] = [];

  for (const topic of weekTopics) {
    const postId = await generateBlogPost(siteId, topic, {
      businessName: tenant.businessName,
      industry: tenant.industry,
      services: tenant.services,
      locations: tenant.locations,
      targetKeywords: tenant.targetKeywords,
    });
    postIds.push(postId);
  }

  return postIds;
}

/**
 * Schedule weekly posts for all active sites.
 * Called by a weekly cron job (e.g., Sunday evening).
 */
export async function scheduleAllWeeklyPosts(): Promise<{
  sitesProcessed: number;
  postsCreated: number;
  errors: number;
}> {
  // Get all live sites with active tenants
  const activeSites = await db
    .select({ siteId: sites.id })
    .from(sites)
    .innerJoin(tenants, eq(sites.tenantId, tenants.id))
    .where(
      and(eq(sites.status, "live"), eq(tenants.status, "active"))
    );

  let sitesProcessed = 0;
  let postsCreated = 0;
  let errors = 0;

  for (const { siteId } of activeSites) {
    try {
      const postIds = await scheduleWeeklyPosts(siteId);
      postsCreated += postIds.length;
      sitesProcessed++;
    } catch (err) {
      console.error(`Failed to schedule posts for site ${siteId}:`, err);
      errors++;
    }
  }

  return { sitesProcessed, postsCreated, errors };
}
