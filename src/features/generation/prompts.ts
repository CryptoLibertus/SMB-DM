import type { AuditPipelineResult } from "@/features/audit/types";
import type { BusinessContext, DesignDirective } from "./types";

/**
 * Build the system prompt for generating a complete Next.js site.
 */
function buildSystemPrompt(): string {
  return `You are an expert web developer specializing in building modern, high-converting business websites using Next.js and Tailwind CSS.

You generate COMPLETE, deployable Next.js applications. Every file you produce must be valid, syntactically correct code.

Rules:
- Use Next.js App Router (app/ directory)
- Use Tailwind CSS v4 for all styling (no separate CSS modules)
- Use TypeScript for all files
- All components must be responsive (mobile-first)
- Include proper SEO meta tags in the layout
- Include a clear hero section, services section, testimonials/trust section, contact section, and footer
- Phone numbers must use tel: links for click-to-call
- Email addresses must use mailto: links
- Include strong, visible CTAs (calls to action)
- Lighthouse performance score should be 80+
- Do NOT use any external image URLs — use colored div placeholders or SVG shapes instead
- Do NOT import any packages not in the package.json provided

You must output a JSON object where keys are file paths and values are file contents. The JSON must be valid and parseable.

Required files:
- "app/page.tsx" — The main homepage component
- "app/layout.tsx" — Root layout with html, head, body, metadata
- "app/globals.css" — Tailwind imports and any custom CSS
- "package.json" — With next, react, react-dom, tailwindcss dependencies
- "next.config.ts" — Next.js configuration
- "tailwind.config.ts" — Tailwind configuration with custom theme
- "tsconfig.json" — TypeScript configuration
- "postcss.config.mjs" — PostCSS config for Tailwind

Output ONLY the JSON object, no markdown fences, no explanation.`;
}

/**
 * Build the user prompt for a specific version, incorporating audit data and business context.
 */
export function buildGenerationPrompt(
  directive: DesignDirective,
  businessContext: BusinessContext,
  auditResult: AuditPipelineResult | null
): string {
  const system = buildSystemPrompt();

  const businessInfo = `
Business Information:
- Name: ${businessContext.businessName}
- Industry: ${businessContext.industry}
- Services: ${businessContext.services.join(", ") || "General services"}
- Locations served: ${businessContext.locations.join(", ") || "Local area"}
- Phone: ${businessContext.phone || "Not provided"}
- Email: ${businessContext.contactEmail}
- Target Keywords: ${businessContext.targetKeywords.join(", ") || "None specified"}`;

  let auditInfo = "";
  if (auditResult) {
    auditInfo = `

Current Website Audit Data:
- SEO Score: ${auditResult.seoScore}/100
- Mobile Score: ${auditResult.mobileScore}/100
- Current Title: ${auditResult.metaTags.title || "None"}
- Current Description: ${auditResult.metaTags.description || "None"}
- Current H1s: ${auditResult.metaTags.h1s.join(", ") || "None"}
- Detected CTAs: ${auditResult.ctaAnalysis.elements.map((e) => `${e.type}: "${e.text}"`).join(", ") || "None"}
- Analytics: GA4=${auditResult.analyticsDetected.ga4}, GTM=${auditResult.analyticsDetected.gtm}

Use this audit data to improve upon the existing site. Address weaknesses found in the audit (missing meta tags, low SEO score, missing CTAs, etc.)`;
  }

  const designInfo = `

Design Directive — "${directive.name}":
${directive.description}

Color Palette: ${directive.colorPalette.join(", ")}
Layout Type: ${directive.layoutType}
Typography: ${directive.typography}

Generate a website that strongly follows this design directive. The visual style should be distinctly "${directive.name}" — different from the other two versions the user will see.`;

  return `${system}

${businessInfo}
${auditInfo}
${designInfo}

Generate the complete Next.js application now. Output ONLY the JSON object mapping file paths to file contents.`;
}

/**
 * Parse the AI's response into a file map.
 * Handles cases where the response might have markdown fences or extra text.
 */
export function parseGeneratedFiles(
  response: string
): Record<string, string> | null {
  let cleaned = response.trim();

  // Strip markdown code fences if present
  if (cleaned.startsWith("```")) {
    const firstNewline = cleaned.indexOf("\n");
    cleaned = cleaned.slice(firstNewline + 1);
    const lastFence = cleaned.lastIndexOf("```");
    if (lastFence !== -1) {
      cleaned = cleaned.slice(0, lastFence);
    }
  }

  // Try to find JSON object boundaries
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.slice(firstBrace, lastBrace + 1);
  }

  try {
    const parsed = JSON.parse(cleaned);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      return null;
    }
    // Validate that all values are strings
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof key !== "string" || typeof value !== "string") {
        return null;
      }
    }
    return parsed as Record<string, string>;
  } catch {
    return null;
  }
}
