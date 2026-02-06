export const TenantStatus = {
  ACTIVE: "active",
  PAUSED: "paused",
  ARCHIVED: "archived",
} as const;
export type TenantStatus = (typeof TenantStatus)[keyof typeof TenantStatus];

export const SubscriptionStatus = {
  ACTIVE: "active",
  PAST_DUE: "past_due",
  CANCELED: "canceled",
  PAUSED: "paused",
} as const;
export type SubscriptionStatus =
  (typeof SubscriptionStatus)[keyof typeof SubscriptionStatus];

export const SiteStatus = {
  DEMO: "demo",
  PROVISIONING: "provisioning",
  LIVE: "live",
  PAUSED: "paused",
  ARCHIVED: "archived",
} as const;
export type SiteStatus = (typeof SiteStatus)[keyof typeof SiteStatus];

export const SiteVersionStatus = {
  GENERATING: "generating",
  READY: "ready",
  FAILED: "failed",
} as const;
export type SiteVersionStatus =
  (typeof SiteVersionStatus)[keyof typeof SiteVersionStatus];

export const DeploymentStatus = {
  BUILDING: "building",
  READY: "ready",
  ERROR: "error",
} as const;
export type DeploymentStatus =
  (typeof DeploymentStatus)[keyof typeof DeploymentStatus];

export const DeploymentTrigger = {
  INITIAL: "initial",
  BLOG: "blog",
  CHANGE: "change",
  ROLLBACK: "rollback",
} as const;
export type DeploymentTrigger =
  (typeof DeploymentTrigger)[keyof typeof DeploymentTrigger];

export const BlogPostStatus = {
  DRAFT: "draft",
  SCHEDULED: "scheduled",
  PUBLISHED: "published",
  FAILED: "failed",
} as const;
export type BlogPostStatus =
  (typeof BlogPostStatus)[keyof typeof BlogPostStatus];

export const ChangeRequestSource = {
  EMAIL: "email",
  DASHBOARD: "dashboard",
} as const;
export type ChangeRequestSource =
  (typeof ChangeRequestSource)[keyof typeof ChangeRequestSource];

export const ChangeRequestType = {
  COPY_EDIT: "copy_edit",
  IMAGE_SWAP: "image_swap",
  NEW_PAGE: "new_page",
  CONTACT_UPDATE: "contact_update",
  OTHER: "other",
} as const;
export type ChangeRequestType =
  (typeof ChangeRequestType)[keyof typeof ChangeRequestType];

export const ChangeRequestStatus = {
  RECEIVED: "received",
  VERIFICATION_HOLD: "verification_hold",
  PROCESSING: "processing",
  PREVIEW_READY: "preview_ready",
  APPROVED: "approved",
  DEPLOYED: "deployed",
  REJECTED: "rejected",
} as const;
export type ChangeRequestStatus =
  (typeof ChangeRequestStatus)[keyof typeof ChangeRequestStatus];

export const ReportType = {
  WEEKLY: "weekly",
  MONTHLY: "monthly",
} as const;
export type ReportType = (typeof ReportType)[keyof typeof ReportType];

export const DemoSessionSource = {
  COLD_OUTREACH: "cold_outreach",
  LIVE_DEMO: "live_demo",
} as const;
export type DemoSessionSource =
  (typeof DemoSessionSource)[keyof typeof DemoSessionSource];

export const DemoSessionStatus = {
  ACTIVE: "active",
  CONVERTED: "converted",
  EXPIRED: "expired",
} as const;
export type DemoSessionStatus =
  (typeof DemoSessionStatus)[keyof typeof DemoSessionStatus];
