import { generateText } from "ai";
import { models } from "@/lib/ai";

interface TenantProfile {
  businessName: string;
  industry: string;
  services: string[];
  locations: string[];
  targetKeywords: string[] | null;
}

/**
 * Generate a list of 8 blog topics per month based on tenant profile.
 */
export async function generateTopicList(
  tenant: TenantProfile
): Promise<string[]> {
  const { text } = await generateText({
    model: models.blog,
    system:
      "You are an SEO content strategist for small businesses. " +
      "Generate blog topic ideas that are specific, actionable, and optimized for local SEO. " +
      "Return ONLY a JSON array of 8 strings, no other text.",
    prompt: `Generate 8 blog post topics for this business:

Business: ${tenant.businessName}
Industry: ${tenant.industry}
Services: ${tenant.services.join(", ")}
Locations: ${tenant.locations.join(", ")}
Target Keywords: ${tenant.targetKeywords?.join(", ") ?? "none specified"}

Requirements:
- Each topic should target a specific long-tail keyword
- Include location-specific topics where relevant
- Mix informational and commercial intent topics
- Topics should be relevant to potential customers searching for these services
- Each topic should be a complete blog post title

Return ONLY a valid JSON array of 8 strings.`,
  });

  try {
    const parsed = JSON.parse(text.trim());
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.map(String);
    }
  } catch {
    // If JSON parsing fails, try to extract topics line by line
    const lines = text
      .split("\n")
      .map((l) => l.replace(/^\d+[\.\)]\s*/, "").trim())
      .filter((l) => l.length > 10);
    if (lines.length >= 4) return lines.slice(0, 8);
  }

  throw new Error("Failed to parse topic list from AI response");
}
