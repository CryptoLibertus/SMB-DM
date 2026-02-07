/** Types specific to the AI generation pipeline */

export interface BusinessContext {
  businessName: string;
  industry: string;
  services: string[];
  locations: string[];
  phone: string | null;
  contactEmail: string;
  targetKeywords: string[];
}

export interface DesignDirective {
  versionNumber: number;
  name: string;
  description: string;
  colorPalette: string[];
  layoutType: string;
  typography: string;
}

export const DESIGN_DIRECTIVES: DesignDirective[] = [
  {
    versionNumber: 1,
    name: "Conversion-Optimized",
    description:
      "A professional, conversion-focused design tailored to the business's industry. Choose a color scheme, typography, and layout that best fits the brand. Prioritize clear CTAs, trust signals, and mobile responsiveness.",
    colorPalette: ["#0F172A", "#3B82F6", "#F8FAFC", "#EAB308", "#1E293B"],
    layoutType: "conversion-optimized",
    typography: "Inter / system fonts",
  },
];

export type GenerationStage =
  | "initializing"
  | "generating"
  | "storing"
  | "complete"
  | "error";

export interface GenerationStageEvent {
  generationId: string;
  stage: GenerationStage;
  message: string;
  versionNumber?: number;
  versionStatus?: "generating" | "ready" | "failed";
  previewUrl?: string;
  error?: string;
}

/** The file map representing a generated Next.js site */
export type SiteFiles = Record<string, string>;

export interface GenerationInput {
  auditResultId: string;
  businessContext: BusinessContext;
  demoSessionId?: string;
}
