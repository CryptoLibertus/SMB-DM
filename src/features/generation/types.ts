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
  versionNumber: 1 | 2 | 3;
  name: string;
  description: string;
  colorPalette: string[];
  layoutType: string;
  typography: string;
}

export const DESIGN_DIRECTIVES: DesignDirective[] = [
  {
    versionNumber: 1,
    name: "Modern & Bold",
    description:
      "Dark hero section, large typography, strong CTAs, high contrast, bold gradients",
    colorPalette: ["#0F172A", "#3B82F6", "#F8FAFC", "#EAB308", "#1E293B"],
    layoutType: "bold-hero",
    typography: "Inter / bold weights",
  },
  {
    versionNumber: 2,
    name: "Clean & Professional",
    description:
      "White space, subtle colors, corporate feel, structured grid layout, refined typography",
    colorPalette: ["#FFFFFF", "#1E3A5F", "#F1F5F9", "#0EA5E9", "#334155"],
    layoutType: "corporate-grid",
    typography: "Source Sans Pro / regular weights",
  },
  {
    versionNumber: 3,
    name: "Warm & Friendly",
    description:
      "Rounded corners, warm palette, approachable tone, friendly illustrations, soft shadows",
    colorPalette: ["#FFF7ED", "#EA580C", "#FAFAF9", "#16A34A", "#78350F"],
    layoutType: "friendly-rounded",
    typography: "Nunito / medium weights",
  },
];

export type GenerationStage =
  | "initializing"
  | "generating_v1"
  | "generating_v2"
  | "generating_v3"
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
