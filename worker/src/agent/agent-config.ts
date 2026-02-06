import type { DesignDirective, BusinessContext } from "../types/generation.js";
import type { AuditPipelineResult } from "../types/audit.js";

export function buildUserPrompt(
  directive: DesignDirective,
  businessContext: BusinessContext,
  auditData: AuditPipelineResult | null,
  workspacePath: string,
  siteId: string,
  siteVersionId: string
): string {
  let prompt = `Generate a complete Next.js website for this business.

## Business Information
- Business Name: ${businessContext.businessName}
- Industry: ${businessContext.industry}
- Services: ${businessContext.services.join(", ") || "General services"}
- Locations: ${businessContext.locations.join(", ") || "Local area"}
- Phone: ${businessContext.phone || "Not provided"}
- Email: ${businessContext.contactEmail}
- Target Keywords: ${businessContext.targetKeywords.join(", ") || "None specified"}

## Design Directive: "${directive.name}"
${directive.description}

Color Palette: ${directive.colorPalette.join(", ")}
Layout Type: ${directive.layoutType}
Typography: ${directive.typography}`;

  if (auditData) {
    prompt += `

## Current Website Audit Data
- SEO Score: ${auditData.seoScore}/100
- Mobile Score: ${auditData.mobileScore}/100
- Current Title: ${auditData.metaTags.title || "None"}
- Current Description: ${auditData.metaTags.description || "None"}
- Current H1s: ${auditData.metaTags.h1s.join(", ") || "None"}
- Detected CTAs: ${auditData.ctaAnalysis.elements.map((e) => `${e.type}: "${e.text}"`).join(", ") || "None"}
- Analytics: GA4=${auditData.analyticsDetected.ga4}, GTM=${auditData.analyticsDetected.gtm}

Use this data to improve upon the existing site. Address the weaknesses found (missing meta tags, low SEO score, missing CTAs).`;
  }

  prompt += `

## Workspace
Write all files to the current working directory: ${workspacePath}

## Context IDs (use these in tool calls)
- siteId: ${siteId}
- siteVersionId: ${siteVersionId}
- versionNumber: ${directive.versionNumber}

Begin by planning the site structure, then write all files. After writing, validate with validate_site (pass workspacePath: "${workspacePath}"), fix any issues, then call store_version with workspacePath "${workspacePath}", siteId "${siteId}", siteVersionId "${siteVersionId}", and versionNumber ${directive.versionNumber}.`;

  return prompt;
}
