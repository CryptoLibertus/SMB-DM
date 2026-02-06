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
