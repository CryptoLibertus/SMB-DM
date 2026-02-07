import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  pgEnum,
  index,
} from "drizzle-orm/pg-core";

// ── Enums ──────────────────────────────────────────────────────────────────────

export const tenantStatusEnum = pgEnum("tenant_status", [
  "active",
  "paused",
  "archived",
]);

export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "active",
  "past_due",
  "canceled",
  "paused",
]);

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

export const deploymentStatusEnum = pgEnum("deployment_status", [
  "building",
  "ready",
  "error",
]);

export const deploymentTriggerEnum = pgEnum("deployment_trigger", [
  "initial",
  "blog",
  "change",
  "rollback",
]);

export const blogPostStatusEnum = pgEnum("blog_post_status", [
  "draft",
  "scheduled",
  "published",
  "failed",
]);

export const changeRequestSourceEnum = pgEnum("change_request_source", [
  "email",
  "dashboard",
]);

export const changeRequestTypeEnum = pgEnum("change_request_type", [
  "copy_edit",
  "image_swap",
  "new_page",
  "contact_update",
  "other",
]);

export const changeRequestStatusEnum = pgEnum("change_request_status", [
  "received",
  "verification_hold",
  "processing",
  "preview_ready",
  "approved",
  "deployed",
  "rejected",
]);

export const reportTypeEnum = pgEnum("report_type", ["weekly", "monthly"]);

export const demoSessionSourceEnum = pgEnum("demo_session_source", [
  "cold_outreach",
  "live_demo",
]);

export const demoSessionStatusEnum = pgEnum("demo_session_status", [
  "active",
  "converted",
  "expired",
]);

// ── Tables ─────────────────────────────────────────────────────────────────────

export const tenants = pgTable("tenants", {
  id: uuid("id").primaryKey().defaultRandom(),
  ownerUserId: text("owner_user_id"),
  businessName: text("business_name").notNull(),
  contactEmail: text("contact_email").notNull(),
  phone: text("phone"),
  industry: text("industry").notNull(),
  services: text("services").array().notNull().default([]),
  locations: text("locations").array().notNull().default([]),
  targetKeywords: text("target_keywords").array().default([]),
  timezone: text("timezone").notNull().default("America/New_York"),
  status: tenantStatusEnum("status").notNull().default("active"),
  onboardingChecklist: jsonb("onboarding_checklist")
    .$type<{
      reviewedSite: boolean;
      connectedDomain: boolean;
      verifiedDns: boolean;
      submittedChangeRequest: boolean;
    }>()
    .notNull()
    .default({
      reviewedSite: false,
      connectedDomain: false,
      verifiedDns: false,
      submittedChangeRequest: false,
    }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const subscriptions = pgTable("subscriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id)
    .unique(),
  stripeCustomerId: text("stripe_customer_id").notNull(),
  stripeSubscriptionId: text("stripe_subscription_id").notNull(),
  status: subscriptionStatusEnum("status").notNull().default("active"),
  currentPeriodEnd: timestamp("current_period_end", {
    withTimezone: true,
  }).notNull(),
  canceledAt: timestamp("canceled_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const sites = pgTable("sites", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id)
    .unique(),
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
  progressStage: text("progress_stage"),
  progressMessage: text("progress_message"),
  status: siteVersionStatusEnum("status").notNull().default("generating"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
}, (table) => [
  index("site_versions_site_id_idx").on(table.siteId),
]);

export const deployments = pgTable("deployments", {
  id: uuid("id").primaryKey().defaultRandom(),
  siteId: uuid("site_id")
    .notNull()
    .references(() => sites.id),
  vercelDeploymentId: text("vercel_deployment_id").notNull(),
  vercelDeploymentUrl: text("vercel_deployment_url").notNull(),
  status: deploymentStatusEnum("status").notNull().default("building"),
  isProduction: boolean("is_production").notNull().default(false),
  triggeredBy: deploymentTriggerEnum("triggered_by").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
}, (table) => [
  index("deployments_site_id_idx").on(table.siteId),
]);

export const auditResults = pgTable("audit_results", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => tenants.id),
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
    detectedIndustry?: string;
    detectedServices?: string[];
    detectedLocations?: string[];
    detectedBusinessName?: string;
  }>(),
  aiAnalysisStatus: text("ai_analysis_status").$type<
    "pending" | "analyzing" | "complete" | "failed"
  >(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
}, (table) => [
  index("audit_results_tenant_id_idx").on(table.tenantId),
]);

export const blogPosts = pgTable("blog_posts", {
  id: uuid("id").primaryKey().defaultRandom(),
  siteId: uuid("site_id")
    .notNull()
    .references(() => sites.id),
  title: text("title").notNull(),
  slug: text("slug").notNull(),
  content: text("content").notNull(),
  targetKeywords: text("target_keywords").array().notNull().default([]),
  wordCount: integer("word_count").notNull().default(0),
  status: blogPostStatusEnum("status").notNull().default("draft"),
  scheduledFor: timestamp("scheduled_for", { withTimezone: true }).notNull(),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  retryCount: integer("retry_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
}, (table) => [
  index("blog_posts_site_id_idx").on(table.siteId),
]);

export const changeRequests = pgTable("change_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  siteId: uuid("site_id")
    .notNull()
    .references(() => sites.id),
  source: changeRequestSourceEnum("source").notNull(),
  requestType: changeRequestTypeEnum("request_type").notNull(),
  description: text("description").notNull(),
  attachments: text("attachments").array().notNull().default([]),
  status: changeRequestStatusEnum("status").notNull().default("received"),
  previewUrl: text("preview_url"),
  previewExpiresAt: timestamp("preview_expires_at", { withTimezone: true }),
  revisionCount: integer("revision_count").notNull().default(0),
  monthlyRequestNumber: integer("monthly_request_number").notNull().default(1),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
}, (table) => [
  index("change_requests_site_id_idx").on(table.siteId),
]);

export const emailReports = pgTable("email_reports", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id),
  reportType: reportTypeEnum("report_type").notNull(),
  periodStart: timestamp("period_start", { withTimezone: true }).notNull(),
  periodEnd: timestamp("period_end", { withTimezone: true }).notNull(),
  content: jsonb("content")
    .$type<{
      traffic: { visits: number; uniqueVisitors: number };
      leads: { total: number; byType: Record<string, number> };
      blogPostsPublished: number;
      notableChanges: string[];
    }>()
    .notNull(),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
}, (table) => [
  index("email_reports_tenant_id_idx").on(table.tenantId),
]);

export const demoSessions = pgTable("demo_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  token: text("token").notNull().unique(),
  auditResultId: uuid("audit_result_id").references(() => auditResults.id),
  tenantId: uuid("tenant_id").references(() => tenants.id),
  sourceType: demoSessionSourceEnum("source_type").notNull(),
  contactEmail: text("contact_email"),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  status: demoSessionStatusEnum("status").notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
}, (table) => [
  index("demo_sessions_audit_result_id_idx").on(table.auditResultId),
]);

export const rateLimitHits = pgTable("rate_limit_hits", {
  id: uuid("id").primaryKey().defaultRandom(),
  key: text("key").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
}, (table) => [
  index("rate_limit_hits_key_created_at_idx").on(table.key, table.createdAt),
]);

export const processedWebhookEvents = pgTable("processed_webhook_events", {
  id: text("id").primaryKey(), // Stripe event ID (evt_xxx)
  eventType: text("event_type").notNull(),
  processedAt: timestamp("processed_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
