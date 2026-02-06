export interface CtaElement {
  type: "phone" | "tel_link" | "contact_form" | "mailto" | "cta_button";
  text: string;
  location: string;
}

export interface CtaAnalysis {
  elements: CtaElement[];
}

export interface SeoMetaTags {
  title: string | null;
  description: string | null;
  h1s: string[];
  robots: string | null;
}

export interface AnalyticsAnalysis {
  ga4: boolean;
  gtm: boolean;
  other: string[];
}

export interface DnsAnalysis {
  registrar: string | null;
  nameservers: string[];
  switchable: boolean;
}

export interface AuditPipelineResult {
  seoScore: number;
  mobileScore: number;
  ctaAnalysis: CtaAnalysis;
  metaTags: SeoMetaTags;
  analyticsDetected: AnalyticsAnalysis;
  dnsInfo: DnsAnalysis;
  screenshotDesktop: string | null;
  screenshotMobile: string | null;
}
