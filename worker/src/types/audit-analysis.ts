export interface AuditAnalyzeRequest {
  auditId: string;
  targetUrl: string;
  basicAuditData: {
    seoScore: number;
    mobileScore: number;
    ctaAnalysis: { elements: { type: string; text: string; location: string }[] };
    metaTags: {
      title: string | null;
      description: string | null;
      h1s: string[];
      robots: string | null;
    };
    analyticsDetected: { ga4: boolean; gtm: boolean; other: string[] };
    dnsInfo: {
      registrar: string | null;
      nameservers: string[];
      switchable: boolean;
    };
  };
}

export interface AiAnalysisFinding {
  category: string;
  severity: "critical" | "warning" | "info";
  title: string;
  detail: string;
  recommendation: string;
}

export interface AiAnalysis {
  summary: string;
  overallGrade: string;
  findings: AiAnalysisFinding[];
  topPriorities: string[];
  detectedIndustry?: string;
  detectedServices?: string[];
  detectedLocations?: string[];
  detectedBusinessName?: string;
}
