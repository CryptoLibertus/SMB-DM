CREATE TYPE "public"."blog_post_status" AS ENUM('draft', 'scheduled', 'published', 'failed');--> statement-breakpoint
CREATE TYPE "public"."change_request_source" AS ENUM('email', 'dashboard');--> statement-breakpoint
CREATE TYPE "public"."change_request_status" AS ENUM('received', 'verification_hold', 'processing', 'preview_ready', 'approved', 'deployed', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."change_request_type" AS ENUM('copy_edit', 'image_swap', 'new_page', 'contact_update', 'other');--> statement-breakpoint
CREATE TYPE "public"."demo_session_source" AS ENUM('cold_outreach', 'live_demo');--> statement-breakpoint
CREATE TYPE "public"."demo_session_status" AS ENUM('active', 'converted', 'expired');--> statement-breakpoint
CREATE TYPE "public"."deployment_status" AS ENUM('building', 'ready', 'error');--> statement-breakpoint
CREATE TYPE "public"."deployment_trigger" AS ENUM('initial', 'blog', 'change', 'rollback');--> statement-breakpoint
CREATE TYPE "public"."report_type" AS ENUM('weekly', 'monthly');--> statement-breakpoint
CREATE TYPE "public"."site_status" AS ENUM('demo', 'provisioning', 'live', 'paused', 'archived');--> statement-breakpoint
CREATE TYPE "public"."site_version_status" AS ENUM('generating', 'ready', 'failed');--> statement-breakpoint
CREATE TYPE "public"."subscription_status" AS ENUM('active', 'past_due', 'canceled', 'paused');--> statement-breakpoint
CREATE TYPE "public"."tenant_status" AS ENUM('active', 'paused', 'archived');--> statement-breakpoint
CREATE TABLE "audit_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid,
	"target_url" text NOT NULL,
	"seo_score" integer DEFAULT 0 NOT NULL,
	"mobile_score" integer DEFAULT 0 NOT NULL,
	"cta_analysis" jsonb DEFAULT '{"elements":[]}'::jsonb NOT NULL,
	"meta_tags" jsonb DEFAULT '{"title":null,"description":null,"h1s":[],"robots":null}'::jsonb NOT NULL,
	"analytics_detected" jsonb DEFAULT '{"ga4":false,"gtm":false,"other":[]}'::jsonb NOT NULL,
	"dns_info" jsonb DEFAULT '{"registrar":null,"nameservers":[],"switchable":false}'::jsonb NOT NULL,
	"screenshot_desktop" text,
	"screenshot_mobile" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "blog_posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"site_id" uuid NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"content" text NOT NULL,
	"target_keywords" text[] DEFAULT '{}' NOT NULL,
	"word_count" integer DEFAULT 0 NOT NULL,
	"status" "blog_post_status" DEFAULT 'draft' NOT NULL,
	"scheduled_for" timestamp with time zone NOT NULL,
	"published_at" timestamp with time zone,
	"retry_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "change_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"site_id" uuid NOT NULL,
	"source" "change_request_source" NOT NULL,
	"request_type" "change_request_type" NOT NULL,
	"description" text NOT NULL,
	"attachments" text[] DEFAULT '{}' NOT NULL,
	"status" "change_request_status" DEFAULT 'received' NOT NULL,
	"preview_url" text,
	"preview_expires_at" timestamp with time zone,
	"revision_count" integer DEFAULT 0 NOT NULL,
	"monthly_request_number" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "demo_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token" text NOT NULL,
	"audit_result_id" uuid,
	"tenant_id" uuid,
	"source_type" "demo_session_source" NOT NULL,
	"contact_email" text,
	"expires_at" timestamp with time zone NOT NULL,
	"status" "demo_session_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "demo_sessions_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "deployments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"site_id" uuid NOT NULL,
	"vercel_deployment_id" text NOT NULL,
	"vercel_deployment_url" text NOT NULL,
	"status" "deployment_status" DEFAULT 'building' NOT NULL,
	"is_production" boolean DEFAULT false NOT NULL,
	"triggered_by" "deployment_trigger" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"report_type" "report_type" NOT NULL,
	"period_start" timestamp with time zone NOT NULL,
	"period_end" timestamp with time zone NOT NULL,
	"content" jsonb NOT NULL,
	"sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "site_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"site_id" uuid NOT NULL,
	"version_number" integer NOT NULL,
	"generated_code_ref" text NOT NULL,
	"preview_url" text NOT NULL,
	"design_meta" jsonb,
	"status" "site_version_status" DEFAULT 'generating' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"vercel_project_id" text NOT NULL,
	"primary_domain" text,
	"preview_domain" text NOT NULL,
	"status" "site_status" DEFAULT 'demo' NOT NULL,
	"selected_version_id" uuid,
	"current_deployment_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sites_tenant_id_unique" UNIQUE("tenant_id")
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"stripe_customer_id" text NOT NULL,
	"stripe_subscription_id" text NOT NULL,
	"status" "subscription_status" DEFAULT 'active' NOT NULL,
	"current_period_end" timestamp with time zone NOT NULL,
	"canceled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "subscriptions_tenant_id_unique" UNIQUE("tenant_id")
);
--> statement-breakpoint
CREATE TABLE "tenants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_name" text NOT NULL,
	"contact_email" text NOT NULL,
	"phone" text,
	"industry" text NOT NULL,
	"services" text[] DEFAULT '{}' NOT NULL,
	"locations" text[] DEFAULT '{}' NOT NULL,
	"target_keywords" text[] DEFAULT '{}',
	"timezone" text DEFAULT 'America/New_York' NOT NULL,
	"status" "tenant_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "audit_results" ADD CONSTRAINT "audit_results_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blog_posts" ADD CONSTRAINT "blog_posts_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "change_requests" ADD CONSTRAINT "change_requests_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "demo_sessions" ADD CONSTRAINT "demo_sessions_audit_result_id_audit_results_id_fk" FOREIGN KEY ("audit_result_id") REFERENCES "public"."audit_results"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "demo_sessions" ADD CONSTRAINT "demo_sessions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deployments" ADD CONSTRAINT "deployments_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_reports" ADD CONSTRAINT "email_reports_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_versions" ADD CONSTRAINT "site_versions_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sites" ADD CONSTRAINT "sites_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;