import { tool } from "@anthropic-ai/claude-code";
import { z } from "zod";
import { db } from "../../db/client.js";
import { auditResults } from "../../db/schema.js";
import { eq } from "drizzle-orm";

export const storeAnalysisTool = tool(
  "store_analysis",
  "Store the completed audit analysis results in the database. Call this once you have finished analyzing the site and have all findings ready.",
  {
    auditId: z.string().uuid().describe("The audit result ID"),
    summary: z.string().describe("2-3 sentence executive summary of the audit"),
    overallGrade: z
      .string()
      .describe("Letter grade from A+ to F (e.g. 'C-', 'B+', 'D')"),
    findings: z
      .array(
        z.object({
          category: z
            .string()
            .describe(
              "One of: Copy & Messaging, Visual Design, Conversion, Technical SEO, Trust & Credibility"
            ),
          severity: z.enum(["critical", "warning", "info"]),
          title: z.string().describe("Short finding title"),
          detail: z
            .string()
            .describe(
              "Detailed explanation with evidence (quote actual text from site)"
            ),
          recommendation: z
            .string()
            .describe("Specific actionable recommendation"),
        })
      )
      .describe("Array of findings"),
    topPriorities: z
      .array(z.string())
      .describe("Top 3 action items, ordered by impact"),
    detectedIndustry: z
      .string()
      .optional()
      .describe(
        "The business's industry category (e.g. 'Plumbing & HVAC', 'Dental', 'Legal')"
      ),
    detectedServices: z
      .array(z.string())
      .optional()
      .describe(
        "Services offered by the business, extracted from site content"
      ),
    detectedLocations: z
      .array(z.string())
      .optional()
      .describe(
        "Locations or service areas mentioned on the site"
      ),
    detectedBusinessName: z
      .string()
      .optional()
      .describe(
        "The business name as it appears on the site"
      ),
  },
  async (args) => {
    try {
      await db
        .update(auditResults)
        .set({
          aiAnalysis: {
            summary: args.summary,
            overallGrade: args.overallGrade,
            findings: args.findings,
            topPriorities: args.topPriorities,
            detectedIndustry: args.detectedIndustry,
            detectedServices: args.detectedServices,
            detectedLocations: args.detectedLocations,
            detectedBusinessName: args.detectedBusinessName,
          },
          aiAnalysisStatus: "complete",
        })
        .where(eq(auditResults.id, args.auditId));

      return {
        content: [
          {
            type: "text" as const,
            text: `Analysis stored successfully for audit ${args.auditId}. Grade: ${args.overallGrade}, ${args.findings.length} findings, ${args.topPriorities.length} priorities.`,
          },
        ],
      };
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unknown storage error";
      return {
        content: [
          {
            type: "text" as const,
            text: `ERROR storing analysis: ${message}`,
          },
        ],
      };
    }
  }
);
