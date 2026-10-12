export interface StockComplianceRuleConfig {
  version: string;
  authority: string;
  effectiveFrom: string;
  effectiveTo?: string;
  description: string;
  maxNonCompliantIncomeRatio: number;      // default: 5.0%
  maxInterestBearingAssetsRatio: number;   // default: 33.0%
  maxInterestBearingDebtRatio: number;     // default: 33.0%
  prohibitedSectors: string[];
  disallowPrivilegedShares: boolean;
}

export interface FundComplianceRuleConfig {
  version: string;
  authority: string;
  effectiveFrom: string;
  requiredUmbrellaFundCategory: string; // e.g. "Katılım Şemsiye Fonu"
  allowedKeywords: string[];
  mandateRequirement: string;
}

export const TKBB_BIST_CURRENT_STOCK_RULES: StockComplianceRuleConfig = {
  version: 'TKBB-BIST-2026.1',
  authority: 'Türkiye Katılım Bankaları Birliği (TKBB) Danışma Kurulu & Borsa İstanbul',
  effectiveFrom: '2021-11-01',
  description: 'TKBB Danışma Kurulu Pay Senedi İhracı ve Alım-Satımı Standardı (Standart No: 1)',
  maxNonCompliantIncomeRatio: 5.0,
  maxInterestBearingAssetsRatio: 33.0,
  maxInterestBearingDebtRatio: 33.0,
  prohibitedSectors: [
    'Alkollü içki üretimi ve ticareti',
    'Tıbbi amaçlar dışındaki uyuşturucu/keyif verici madde üretimi ve ticareti',
    'Kumar ve şans oyunları faaliyetleri',
    'Domuz ve mamullerinin üretimi ve ticareti',
    'Faizli finans işlemleri ve faizli aracılık faaliyetleri',
    'Vadeli altın, gümüş ve döviz ticareti',
    'Ahlaka ve genel değerlere aykırı yayıncılık ve eğlence',
    'Tütün ürünleri üretimi ve ticareti'
  ],
  disallowPrivilegedShares: true
};

export const TKBB_CURRENT_FUND_RULES: FundComplianceRuleConfig = {
  version: 'TKBB-TEFAS-2026.1',
  authority: 'Sermaye Piyasası Kurulu (SPK) & TKBB Danışma Kurulu',
  effectiveFrom: '2022-01-01',
  requiredUmbrellaFundCategory: 'Katılım Şemsiye Fonu',
  allowedKeywords: ['katılım', 'kira sertifikası', 'sukuk', 'katılma hesabı', 'altın katılım'],
  mandateRequirement: 'Fon izahnamesinde portföy yatırımlarının sadece katılım finans ilkelerine uygun varlıklara yönlendirileceği taahhüt edilmelidir.'
};

export const STANDARD_LEGAL_DISCLAIMER =
  'Bu bilgi yatırım tavsiyesi veya şer\'i fetva niteliğinde değildir. Şirket ve fonların resmi Borsa İstanbul, KAP ve TEFAS beyanlarındaki en son katılım finansı kriterlerine göre oluşturulmuştur.';
