import {
  pgTable,
  uuid,
  text,
  integer,
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
