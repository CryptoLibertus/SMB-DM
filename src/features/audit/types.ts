/** Types specific to the audit engine pipeline */

export interface CrawlResult {
  html: string;
  url: string;
  finalUrl: string;
  statusCode: number;
  screenshotDesktopBuffer: Buffer | null;
  screenshotMobileBuffer: Buffer | null;
  error: string | null;
}

export interface SeoAnalysis {
  seoScore: number;
  metaTags: {
    title: string | null;
    description: string | null;
    h1s: string[];
    robots: string | null;
  };
  robotsTxt: string | null;
  keywordAnalysis: {
    titleKeywords: string[];
    descriptionKeywords: string[];
    h1Keywords: string[];
  };
}

export interface MobileAnalysis {
  mobileScore: number;
  hasViewportMeta: boolean;
  hasResponsiveStyles: boolean;
  lighthouseScore: number | null;
}

export interface AnalyticsAnalysis {
  ga4: boolean;
  gtm: boolean;
  other: string[];
}

export interface CtaElement {
  type: "phone" | "tel_link" | "contact_form" | "mailto" | "cta_button";
  text: string;
  location: string;
}

export interface CtaAnalysis {
  elements: CtaElement[];
}

export interface DnsAnalysis {
  registrar: string | null;
  nameservers: string[];
  switchable: boolean;
}

export type AuditStage =
  | "crawling"
  | "seo"
  | "mobile"
  | "cta"
  | "dns"
  | "complete"
  | "error";

export interface AuditStageEvent {
  stage: number;
  totalStages: number;
  stageName: AuditStage;
  message: string;
  auditId: string;
  partialResults?: Partial<AuditPipelineResult>;
}

export interface AuditPipelineResult {
  seoScore: number;
  mobileScore: number;
  ctaAnalysis: CtaAnalysis;
  metaTags: SeoAnalysis["metaTags"];
  analyticsDetected: AnalyticsAnalysis;
  dnsInfo: DnsAnalysis;
  screenshotDesktop: string | null;
  screenshotMobile: string | null;
}
