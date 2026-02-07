import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  pgEnum,
} from "drizzle-orm/pg-core";

export const siteStatusEnum = pgEnum("site_status", [
  "demo",
  "provisioning",
  "live",
  "paused",
  "archived",
]);

export const siteVersionStatusEnum = pgEnum("site_version_status", [
  "generating",
  "ready",
  "failed",
]);

export const sites = pgTable("sites", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().unique(),
  vercelProjectId: text("vercel_project_id").notNull(),
  primaryDomain: text("primary_domain"),
  previewDomain: text("preview_domain").notNull(),
  status: siteStatusEnum("status").notNull().default("demo"),
  generationId: text("generation_id"),
  selectedVersionId: uuid("selected_version_id"),
  currentDeploymentId: uuid("current_deployment_id"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const auditResults = pgTable("audit_results", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id"),
  targetUrl: text("target_url").notNull(),
  seoScore: integer("seo_score").notNull().default(0),
  mobileScore: integer("mobile_score").notNull().default(0),
  ctaAnalysis: jsonb("cta_analysis")
    .$type<{
      elements: { type: string; text: string; location: string }[];
    }>()
    .notNull()
    .default({ elements: [] }),
  metaTags: jsonb("meta_tags")
    .$type<{
      title: string | null;
      description: string | null;
      h1s: string[];
      robots: string | null;
    }>()
    .notNull()
    .default({ title: null, description: null, h1s: [], robots: null }),
  analyticsDetected: jsonb("analytics_detected")
    .$type<{ ga4: boolean; gtm: boolean; other: string[] }>()
    .notNull()
    .default({ ga4: false, gtm: false, other: [] }),
  dnsInfo: jsonb("dns_info")
    .$type<{
      registrar: string | null;
      nameservers: string[];
      switchable: boolean;
    }>()
    .notNull()
    .default({ registrar: null, nameservers: [], switchable: false }),
  extractedImages: jsonb("extracted_images")
    .$type<{
      images: {
        src: string;
        alt: string | null;
        width: number | null;
        height: number | null;
        context: "img_tag" | "css_background" | "og_image";
      }[];
    }>()
    .notNull()
    .default({ images: [] }),
  completedStage: integer("completed_stage").notNull().default(0),
  screenshotDesktop: text("screenshot_desktop"),
  screenshotMobile: text("screenshot_mobile"),
  aiAnalysis: jsonb("ai_analysis").$type<{
    summary: string;
    overallGrade: string;
    findings: {
      category: string;
      severity: "critical" | "warning" | "info";
      title: string;
      detail: string;
      recommendation: string;
    }[];
    topPriorities: string[];
  }>(),
  aiAnalysisStatus: text("ai_analysis_status").$type<
    "pending" | "analyzing" | "complete" | "failed"
  >(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const siteVersions = pgTable("site_versions", {
  id: uuid("id").primaryKey().defaultRandom(),
  siteId: uuid("site_id")
    .notNull()
    .references(() => sites.id),
  versionNumber: integer("version_number").notNull(),
  generatedCodeRef: text("generated_code_ref").notNull(),
  previewUrl: text("preview_url").notNull(),
  designMeta: jsonb("design_meta").$type<{
    colorPalette: string[];
    layoutType: string;
    typography: string;
  }>(),
  status: siteVersionStatusEnum("status").notNull().default("generating"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
