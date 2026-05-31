// Funnelguard — type definitions
// Pure TypeScript, no external dependencies.

export type Severity = 'Critical' | 'Warning' | 'Info';
export type Category = 'UTM Integrity' | 'Form Binding' | 'Lifecycle Logic' | 'Attribution Gap';

export interface Finding {
  id: string;               // 'FG-001'
  category: Category;
  severity: Severity;
  headline: string;         // one sentence, practitioner voice
  detail: string;           // why it matters
  fix: string;              // exact actionable fix
  criticalContext?: string; // "Critical because: ..." plain-English for non-HS readers
  affectedObjects: string[]; // IDs of scanned objects implicated
}

export interface UTMTaxonomy {
  validSources: string[];
  validMediums: string[];
  retiredCampaigns: string[];
}

export interface Campaign {
  id: string;
  name: string;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string | null;
  status: 'active' | 'retired';
  defect: string | null;
}

export interface Form {
  id: string;
  name: string;
  lifecycleStageAssigned: string | null;
  lifecycleStageOverwrite: boolean;
  workflowEnrollments: string[];
  ownerAssigned: boolean;
  thankYouUrl: string;
  thankYouUrl404?: boolean;
  crmIntegration: boolean;
  listEnrollments?: string[];
  defect: string | null;
}

export interface ContactSegment {
  segment: string;
  count: number;
  lifecycleStage: string;
  ownerAssigned?: boolean;
  lastOwnerActivityDays?: number;
  openOpportunity?: boolean;
  activeWorkflows?: string[];
  attributionSource?: string;
  defect: string | null;
}

export interface Workflow {
  id: string;
  name: string;
  status: string;
  stepCount: number;
  enrollmentTriggers: string[];
  missingTriggers?: string[];
  enrollmentFormIdExpected?: string;
  enrollmentFormIdActual?: string;
  activeEnrollments: number;
  totalEnrollmentsLast180Days?: number;
  totalEnrollmentsAllTime?: number;
  customerStageEnrolled?: number;
  triggerCampaign?: string;
  defect: string | null;
}

export interface FunnelConfig {
  scenario: string;
  label: string;
  description: string;
  scannedObjectCount: number;
  utmTaxonomy: UTMTaxonomy;
  campaigns: Campaign[];
  forms: Form[];
  lifecycleStages: string[];
  contacts: ContactSegment[];
  workflows: Workflow[];
}

export type Rule = (config: FunnelConfig) => Finding[];

export interface ScenarioMeta {
  id: string;
  label: string;
  path: string;
}

export interface SeverityCounts {
  Critical: number;
  Warning: number;
  Info: number;
}
