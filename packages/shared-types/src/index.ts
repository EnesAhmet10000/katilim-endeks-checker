/**
 * Katılım Finans Uygunluk Kontrolü Ortak Veri Tipleri ve DTO'lar
 */

export enum InstrumentType {
  STOCK = 'STOCK',
  MUTUAL_FUND = 'MUTUAL_FUND',
  ETF = 'ETF',
  PENSION_FUND = 'PENSION_FUND',
  UNKNOWN = 'UNKNOWN'
}

export enum ComplianceStatus {
  COMPLIANT = 'COMPLIANT',
  NON_COMPLIANT = 'NON_COMPLIANT',
  UNCERTAIN = 'UNCERTAIN',
  INSUFFICIENT_DATA = 'INSUFFICIENT_DATA',
  CONFLICTING_SOURCES = 'CONFLICTING_SOURCES',
  STALE_DATA = 'STALE_DATA'
}

export enum ConfidenceLevel {
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW'
}

export enum SourceTier {
  OFFICIAL_PRIMARY = 'OFFICIAL_PRIMARY',       // BIST, KAP, SPK, TEFAS
  OFFICIAL_REGULATORY = 'OFFICIAL_REGULATORY', // TKBB Danışma Kurulu
  REPUTABLE_THIRD_PARTY = 'REPUTABLE_THIRD_PARTY', // Saygın analiz portalları
  COMMUNITY = 'COMMUNITY',
  UNKNOWN = 'UNKNOWN'
}

export enum SourceName {
  BIST = 'Borsa İstanbul',
  KAP = 'Kamuyu Aydınlatma Platformu (KAP)',
  TKBB = 'TKBB Danışma Kurulu',
  TEFAS = 'TEFAS Fon Platformu',
  THIRD_PARTY = 'Üçüncü Taraf Analiz'
}

export interface InstrumentSummary {
  kapUrl?: string;
  id: string;
  symbol: string;
  isin?: string;
  name: string;
  shortName?: string;
  type: InstrumentType;
  sector?: string;
  founder?: string; // For funds
  fundType?: string; // e.g. "Katılım Hisse Senedi Fonu"
  umbrellaFund?: string; // e.g. "Katılım Şemsiye Fonu"
  logoUrl?: string;
}

export interface CriterionCheck {
  id: string;
  name: string;
  category: 'ACTIVITY' | 'FINANCIAL_RATIO' | 'GOVERNANCE' | 'FUND_MANDATE';
  description: string;
  actualValue?: number | string | boolean;
  actualFormatted?: string;
  thresholdValue?: number | string;
  thresholdFormatted?: string;
  unit?: '%' | 'TL' | 'TEXT' | 'BOOLEAN';
  isPassed: boolean;
  statusText: string;
  note?: string;
}

export interface IndexMembershipInfo {
  indexCode: string; // e.g., "XKTM", "XKT100", "XKT50", "XKT30", "XKTTM"
  indexName: string; // e.g., "BIST Katılım Tüm"
  isMember: boolean;
  period?: string;   // e.g., "2026/05 - 2026/10"
  description?: string;
}

export interface SourceProvenance {
  sourceName: SourceName;
  tier: SourceTier;
  url?: string;
  title: string;
  badgeText: string;
  isCompliantAccordingToSource?: boolean;
  financialPeriod?: string;
  publishedAt?: string;
  fetchedAt: string;
  disclosureId?: string;
  notes?: string;
}

export interface ComplianceEvaluation {
  instrument: InstrumentSummary;
  status: ComplianceStatus;
  statusLabel: string;
  statusBadgeVariant: 'success' | 'danger' | 'warning' | 'neutral';
  summaryReason: string;
  detailedExplanation?: string;
  confidence: ConfidenceLevel;
  ruleSetVersion: string;
  ruleSetAuthority: string;
  asOf: string; // ISO date string
  financialPeriod?: string; // e.g. "2026/06"
  isCached: boolean;
  cachedAt?: string;
  criteria: CriterionCheck[];
  indices: IndexMembershipInfo[];
  sources: SourceProvenance[];
  disclaimer: string;
}

export interface DisambiguationCandidate {
  symbol: string;
  name: string;
  type: InstrumentType;
  score: number;
  highlightMatch?: string;
}

export interface ResolutionResult {
  isResolved: boolean;
  instrument?: InstrumentSummary;
  isAmbiguous: boolean;
  candidates?: DisambiguationCandidate[];
  originalQuery: string;
  normalizedQuery: string;
}

export interface ComplianceCheckRequest {
  query: string;
  locale?: string;
  forceRefresh?: boolean;
}

export interface ComplianceCheckResponse {
  success: boolean;
  error?: string;
  resolution: ResolutionResult;
  evaluation?: ComplianceEvaluation;
  executionTimeMs: number;
}

export interface AutocompleteItem {
  symbol: string;
  name: string;
  type: InstrumentType;
  status?: ComplianceStatus;
  statusLabel?: string;
  sector?: string;
}

export interface AutocompleteResponse {
  query: string;
  results: AutocompleteItem[];
}

export interface SystemHealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  version: string;
  uptimeSeconds: number;
  timestamp: string;
  sources: {
    bist: { status: 'up' | 'down'; lastSync?: string; totalItems: number };
    kap: { status: 'up' | 'down'; lastSync?: string; totalForms: number };
    tefas: { status: 'up' | 'down'; lastSync?: string; totalFunds: number };
    cache: { status: 'up' | 'down'; size: number; hitRate: number };
  };
}
