import { generateText } from "ai";
import { models } from "@/lib/ai";
import { db } from "@/lib/db";
import { blogPosts, sites } from "@/db/schema";
import { eq } from "drizzle-orm";
import { deploySiteVersion } from "@/features/generation/deploy";

interface TenantProfile {
  businessName: string;
  industry: string;
  services: string[];
  locations: string[];
  targetKeywords: string[] | null;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

/**
 * Generate a blog post using AI and create a BlogPost record.
 */
export async function generateBlogPost(
  siteId: string,
  topic: string,
  tenant: TenantProfile
): Promise<string> {
  const { text } = await generateText({
    model: models.blog,
    system:
      "You are an expert blog content writer for small businesses. " +
      "Write SEO-optimized, engaging blog posts that drive local traffic. " +
      "Return ONLY a JSON object with keys: title (string), content (string of HTML), targetKeywords (string array). " +
      "The content should be well-structured HTML with h2/h3 headings, paragraphs, and lists. " +
      "Do NOT include html/head/body tags, just the article content.",
    prompt: `Write a blog post about: "${topic}"

Business: ${tenant.businessName}
Industry: ${tenant.industry}
Services: ${tenant.services.join(", ")}
Locations: ${tenant.locations.join(", ")}
Target Keywords: ${tenant.targetKeywords?.join(", ") ?? "none specified"}

Requirements:
- 600-1200 words
- Include the business name and location naturally
- Use target keywords naturally throughout
- Include a compelling introduction and conclusion
- Use H2 and H3 headings for structure
- Include a call-to-action at the end

Return ONLY valid JSON: { "title": "...", "content": "<article HTML>", "targetKeywords": ["..."] }`,
  });

  let title: string;
  let content: string;
  let targetKeywords: string[];

  try {
    const parsed = JSON.parse(text.trim());
    title = parsed.title;
    content = parsed.content;
    targetKeywords = parsed.targetKeywords ?? [];
  } catch {
    // Fallback: use topic as title, raw text as content
    title = topic;
    content = `<article>${text}</article>`;
    targetKeywords = tenant.targetKeywords ?? [];
  }

  const wordCount = content.replace(/<[^>]*>/g, "").split(/\s+/).length;

  // Schedule for the next available slot (Tuesday or Thursday at 9 AM)
  const scheduledFor = getNextScheduleSlot();

  const [post] = await db
    .insert(blogPosts)
    .values({
      siteId,
      title,
      slug: slugify(title),
      content,
      targetKeywords,
      wordCount,
      status: "scheduled",
      scheduledFor,
    })
    .returning();

  return post.id;
}

/**
 * Publish a blog post by deploying it to the SMB site.
 */
export async function publishBlogPost(postId: string): Promise<void> {
  const [post] = await db
    .select()
    .from(blogPosts)
    .where(eq(blogPosts.id, postId))
    .limit(1);

  if (!post) throw new Error(`BlogPost ${postId} not found`);

  const [site] = await db
    .select()
    .from(sites)
    .where(eq(sites.id, post.siteId))
    .limit(1);

  if (!site) throw new Error(`Site ${post.siteId} not found`);
  if (!site.selectedVersionId) {
    throw new Error(`Site ${post.siteId} has no selected version`);
  }

  try {
    await deploySiteVersion(post.siteId, site.selectedVersionId, "blog");

    await db
      .update(blogPosts)
      .set({ status: "published", publishedAt: new Date() })
      .where(eq(blogPosts.id, postId));
  } catch (err) {
    await db
      .update(blogPosts)
      .set({ status: "failed" })
      .where(eq(blogPosts.id, postId));
    throw err;
  }
}

/**
 * Retry publishing a failed blog post (max 3 retries).
 */
export async function retryFailedPost(postId: string): Promise<boolean> {
  const [post] = await db
    .select()
    .from(blogPosts)
    .where(eq(blogPosts.id, postId))
    .limit(1);

  if (!post) throw new Error(`BlogPost ${postId} not found`);

  if (post.retryCount >= 3) {
    return false;
  }

  await db
    .update(blogPosts)
    .set({
      retryCount: post.retryCount + 1,
      status: "scheduled",
    })
    .where(eq(blogPosts.id, postId));

  try {
    await publishBlogPost(postId);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get the next Tuesday or Thursday at 9 AM UTC for scheduling.
 */
function getNextScheduleSlot(): Date {
  const now = new Date();
  const day = now.getUTCDay(); // 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat

  let daysUntilNext: number;
  if (day < 2) {
    // Sun or Mon -> next Tuesday
    daysUntilNext = 2 - day;
  } else if (day === 2) {
    // Tuesday -> next Thursday
    daysUntilNext = 2;
  } else if (day < 4) {
    // Wed -> next Thursday
    daysUntilNext = 4 - day;
  } else if (day === 4) {
    // Thursday -> next Tuesday
    daysUntilNext = 5;
  } else {
    // Fri/Sat -> next Tuesday
    daysUntilNext = (2 + 7 - day) % 7 || 7;
  }

  const next = new Date(now);
  next.setUTCDate(now.getUTCDate() + daysUntilNext);
  next.setUTCHours(9, 0, 0, 0);

  return next;
}
