import {
  ComplianceEvaluation,
  ComplianceStatus,
  ConfidenceLevel,
  CriterionCheck,
  IndexMembershipInfo,
  InstrumentSummary,
  InstrumentType,
  SourceName,
  SourceProvenance,
  SourceTier
} from '@katilim/shared-types';
import {
  FundComplianceRuleConfig,
  STANDARD_LEGAL_DISCLAIMER,
  StockComplianceRuleConfig,
  TKBB_BIST_CURRENT_STOCK_RULES,
  TKBB_CURRENT_FUND_RULES
} from './rules.js';

export interface RawStockFinancialMetrics {
  nonCompliantIncomeRatio?: number;      // percentage, e.g. 1.8 for 1.8%
  interestBearingAssetsRatio?: number;   // percentage, e.g. 14.5 for 14.5%
  interestBearingDebtRatio?: number;     // percentage, e.g. 21.0 for 21.0%
  hasProhibitedActivity?: boolean;
  prohibitedActivityDescription?: string;
  hasPrivilegedShares?: boolean;
  privilegedSharesDescription?: string;
  financialPeriod?: string;              // e.g. "2026/06"
  disclosureDate?: string;               // ISO or date
  disclosureId?: string;
  disclosureUrl?: string;
  isConsolidated?: boolean;
}

export interface RawIndexMembershipRecord {
  indexCode: string;
  indexName: string;
  isIncluded: boolean;
  period?: string;
  sourceUrl?: string;
}

export interface RawFundData {
  umbrellaFundCategory?: string;  // e.g. "Katılım Şemsiye Fonu"
  fundType?: string;              // e.g. "Katılım Hisse Senedi Fonu"
  fundName: string;
  tefasCode: string;
  founder?: string;
  hasShariaBoardApproval?: boolean;
  prospectusUrl?: string;
  tefasUrl?: string;
}

export class ComplianceEngine {
  private stockRules: StockComplianceRuleConfig;
  private fundRules: FundComplianceRuleConfig;

  constructor(
    stockRules: StockComplianceRuleConfig = TKBB_BIST_CURRENT_STOCK_RULES,
    fundRules: FundComplianceRuleConfig = TKBB_CURRENT_FUND_RULES
  ) {
    this.stockRules = stockRules;
    this.fundRules = fundRules;
  }

  /**
   * Evaluate a Stock against TKBB & BIST rules
   */
  public evaluateStock(params: {
    instrument: InstrumentSummary;
    financials?: RawStockFinancialMetrics | null;
    indices?: RawIndexMembershipRecord[];
    thirdPartyObservations?: {
      sourceName: string;
      isCompliant: boolean;
      url?: string;
      notes?: string;
      checkedAt: string;
    }[];
  }): ComplianceEvaluation {
    const { instrument, financials, indices = [], thirdPartyObservations = [] } = params;
    const nowIso = new Date().toISOString();

    // If there is zero financial data and zero index data
    if (!financials && indices.length === 0) {
      return {
        instrument,
        status: ComplianceStatus.INSUFFICIENT_DATA,
        statusLabel: 'Veri Yetersiz',
        statusBadgeVariant: 'neutral',
        summaryReason: 'Bu hisse için BIST Katılım Endeksi veya KAP Katılım Finansı İlkeleri Bilgi Formu verisi bulunamadı.',
        detailedExplanation: 'Şirketin henüz KAP üzerinde Katılım Finansı İlkeleri Bilgi Formu beyanı bulunmuyor veya mali sektör hariç tutulan kurumlar listesinde olabilir.',
        confidence: ConfidenceLevel.LOW,
        ruleSetVersion: this.stockRules.version,
        ruleSetAuthority: this.stockRules.authority,
        asOf: nowIso,
        isCached: false,
        criteria: [],
        indices: [],
        sources: [],
        disclaimer: STANDARD_LEGAL_DISCLAIMER
      };
    }

    const criteria: CriterionCheck[] = [];
    let isAllCriteriaPassed = true;
    let hasMissingCriterion = false;

    // 1. Faaliyet Alanı Kriteri
    if (financials?.hasProhibitedActivity !== undefined) {
      const isPassed = !financials.hasProhibitedActivity;
      if (!isPassed) isAllCriteriaPassed = false;
      criteria.push({
        id: 'CRIT_ACTIVITY',
        name: 'Faaliyet Alanı Uygunluğu',
        category: 'ACTIVITY',
        description: 'Esas sözleşme ve ana faaliyetlerde katılım finans ilkelerine aykırı alanların bulunmaması.',
        actualValue: financials.hasProhibitedActivity ? 'Uygun Olmayan Faaliyet Var' : 'Engelli Faaliyet Yok',
        actualFormatted: financials.hasProhibitedActivity ? 'Aykırı Faaliyet Tespit Edildi' : 'Uygun',
        thresholdValue: 'Aykırı faaliyet bulunmamalı',
        thresholdFormatted: 'Sıfır Tolerans',
        isPassed,
        statusText: isPassed ? 'Limit Dahilinde (Uygun)' : 'Aykırı Faaliyet Mevcut',
        note: financials.prohibitedActivityDescription
      });
    } else {
      hasMissingCriterion = true;
    }

    // 2. Uygun Olmayan Gelir Oranı (Limit: <= 5.0%)
    if (financials?.nonCompliantIncomeRatio !== undefined && financials.nonCompliantIncomeRatio !== null) {
      const ratio = financials.nonCompliantIncomeRatio;
      const isPassed = ratio <= this.stockRules.maxNonCompliantIncomeRatio;
      if (!isPassed) isAllCriteriaPassed = false;
      criteria.push({
        id: 'CRIT_INCOME',
        name: 'Uygun Olmayan Gelir Oranı',
        category: 'FINANCIAL_RATIO',
        description: 'Katılım finansına uygun olmayan gelirlerin toplam hasılata oranı.',
        actualValue: ratio,
        actualFormatted: `%${ratio.toFixed(2)}`,
        thresholdValue: this.stockRules.maxNonCompliantIncomeRatio,
        thresholdFormatted: `≤ %${this.stockRules.maxNonCompliantIncomeRatio.toFixed(1)}`,
        unit: '%',
        isPassed,
        statusText: isPassed ? 'Limit Altında (Uygun)' : 'Limit Aşıldı',
        note: isPassed ? undefined : `Uygun olmayan gelir oranı sınırı (%${this.stockRules.maxNonCompliantIncomeRatio}) aşıldı.`
      });
    } else {
      hasMissingCriterion = true;
    }

    // 3. Faizli Varlıklar Oranı (Limit: <= 33.0%)
    if (financials?.interestBearingAssetsRatio !== undefined && financials.interestBearingAssetsRatio !== null) {
      const ratio = financials.interestBearingAssetsRatio;
      const isPassed = ratio <= this.stockRules.maxInterestBearingAssetsRatio;
      if (!isPassed) isAllCriteriaPassed = false;
      criteria.push({
        id: 'CRIT_ASSETS',
        name: 'Faizli Finansal Varlıklar Oranı',
        category: 'FINANCIAL_RATIO',
        description: 'Faiz getirili nakit ve menkul kıymetlerin toplam varlıklara veya piyasa değerine oranı.',
        actualValue: ratio,
        actualFormatted: `%${ratio.toFixed(2)}`,
        thresholdValue: this.stockRules.maxInterestBearingAssetsRatio,
        thresholdFormatted: `≤ %${this.stockRules.maxInterestBearingAssetsRatio.toFixed(1)}`,
        unit: '%',
        isPassed,
        statusText: isPassed ? 'Limit Altında (Uygun)' : 'Limit Aşıldı',
        note: isPassed ? undefined : `Faizli varlık oranı sınırı (%${this.stockRules.maxInterestBearingAssetsRatio}) aşıldı.`
      });
    } else {
      hasMissingCriterion = true;
    }

    // 4. Faizli Borçlar Oranı (Limit: <= 33.0%)
    if (financials?.interestBearingDebtRatio !== undefined && financials.interestBearingDebtRatio !== null) {
      const ratio = financials.interestBearingDebtRatio;
      const isPassed = ratio <= this.stockRules.maxInterestBearingDebtRatio;
      if (!isPassed) isAllCriteriaPassed = false;
      criteria.push({
        id: 'CRIT_DEBT',
        name: 'Faizli Borçlar Oranı',
        category: 'FINANCIAL_RATIO',
        description: 'Faizli borçların toplam varlıklara veya piyasa değerine oranı.',
        actualValue: ratio,
        actualFormatted: `%${ratio.toFixed(2)}`,
        thresholdValue: this.stockRules.maxInterestBearingDebtRatio,
        thresholdFormatted: `≤ %${this.stockRules.maxInterestBearingDebtRatio.toFixed(1)}`,
        unit: '%',
        isPassed,
        statusText: isPassed ? 'Limit Altında (Uygun)' : 'Limit Aşıldı',
        note: isPassed ? undefined : `Faizli borç oranı sınırı (%${this.stockRules.maxInterestBearingDebtRatio}) aşıldı.`
      });
    } else {
      hasMissingCriterion = true;
    }

    // 5. İmtiyazlı Pay Kriteri
    if (financials?.hasPrivilegedShares !== undefined) {
      const isPassed = !financials.hasPrivilegedShares;
      if (!isPassed) isAllCriteriaPassed = false;
      criteria.push({
        id: 'CRIT_PRIVILEGE',
        name: 'İmtiyazlı Pay Durumu',
        category: 'GOVERNANCE',
        description: 'Katılım finans standartlarına aykırı yönetim ve oy hakkı imtiyazının bulunmaması.',
        actualValue: financials.hasPrivilegedShares ? 'Aykırı İmtiyaz Var' : 'Aykırı İmtiyaz Yok',
        actualFormatted: financials.hasPrivilegedShares ? 'İmtiyaz Mevcut' : 'Uygun',
        thresholdValue: 'Aykırı imtiyaz bulunmamalı',
        thresholdFormatted: 'Sıfır Tolerans',
        isPassed,
        statusText: isPassed ? 'Uygun' : 'Aykırı İmtiyaz Tespit Edildi',
        note: financials.privilegedSharesDescription
      });
    }

    // Indices evaluation
    const defaultIndexCodes = ['XKTM', 'XKT100', 'XKT50', 'XKT30'];
    const indexNamesMap: Record<string, string> = {
      XKTM: 'BIST Katılım Tüm',
      XKT100: 'BIST Katılım 100',
      XKT50: 'BIST Katılım 50',
      XKT30: 'BIST Katılım 30',
      XKTTM: 'BIST Katılım Temettü'
    };

    const evaluatedIndices: IndexMembershipInfo[] = [];
    const bistKatilimTumRecord = indices.find(i => i.indexCode === 'XKTM');
    const isBistKatilimTumMember = bistKatilimTumRecord ? bistKatilimTumRecord.isIncluded : false;

    for (const code of defaultIndexCodes) {
      const found = indices.find(i => i.indexCode === code);
      evaluatedIndices.push({
        indexCode: code,
        indexName: indexNamesMap[code] || code,
        isMember: found ? found.isIncluded : false,
        period: found?.period,
        description: found?.isIncluded
          ? `${indexNamesMap[code]} endeksine dahildir.`
          : `${indexNamesMap[code]} endeksinde bulunmuyor (Piyasa büyüklüğü sıralaması nedeniyle olmayabilir).`
      });
    }

    // Sources assembly
    const sources: SourceProvenance[] = [];

    // BIST Source
    sources.push({
      sourceName: SourceName.BIST,
      tier: SourceTier.OFFICIAL_PRIMARY,
      title: 'Borsa İstanbul Katılım Endeksleri',
      badgeText: isBistKatilimTumMember ? 'XKTM Kapsamında' : 'XKTM Kapsamı Dışında',
      isCompliantAccordingToSource: isBistKatilimTumMember,
      url: bistKatilimTumRecord?.sourceUrl || 'https://www.borsaistanbul.com/tr/sayfa/4049/bist-katilim-endeksleri',
      publishedAt: bistKatilimTumRecord?.period,
      fetchedAt: nowIso
    });

    // KAP Source
    if (financials) {
      sources.push({
        sourceName: SourceName.KAP,
        tier: SourceTier.OFFICIAL_PRIMARY,
        title: 'KAP Katılım Finansı İlkeleri Bilgi Formu',
        badgeText: isAllCriteriaPassed ? 'KAFİF Kriterleri Karşılandı' : 'KAFİF Kriterlerinde Aşım',
        isCompliantAccordingToSource: isAllCriteriaPassed,
        financialPeriod: financials.financialPeriod,
        publishedAt: financials.disclosureDate,
        disclosureId: financials.disclosureId,
        url: financials.disclosureUrl || `https://www.kap.org.tr/tr/sirket-bilgileri/genel/${instrument.symbol.toLowerCase()}`,
        fetchedAt: nowIso,
        notes: financials.isConsolidated ? 'Konsolide mali tablolar' : 'Solo mali tablolar'
      });
    }

    // Third Party Sources
    for (const tp of thirdPartyObservations) {
      sources.push({
        sourceName: SourceName.THIRD_PARTY,
        tier: SourceTier.REPUTABLE_THIRD_PARTY,
        title: tp.sourceName,
        badgeText: tp.isCompliant ? 'Uygun Değerlendirdi' : 'Uygun Değil Değerlendirdi',
        isCompliantAccordingToSource: tp.isCompliant,
        url: tp.url,
        fetchedAt: tp.checkedAt,
        notes: tp.notes
      });
    }

    // Determine Final Status
    let status = ComplianceStatus.UNCERTAIN;
    let statusLabel = 'Belirsiz';
    let statusBadgeVariant: 'success' | 'danger' | 'warning' | 'neutral' = 'warning';
    let summaryReason = '';
    let detailedExplanation = '';
    let confidence = ConfidenceLevel.HIGH;

    // Check if official sources match
    const hasFinancialViolation = criteria.some(c => !c.isPassed);

    if (isBistKatilimTumMember && !hasFinancialViolation) {
      status = ComplianceStatus.COMPLIANT;
      statusLabel = 'Katılım Kriterlerine Uygun';
      statusBadgeVariant = 'success';
      summaryReason = `BIST Katılım Tüm endeksinde yer almaktadır ve KAP ${financials?.financialPeriod || 'güncel'} dönemindeki finansal oran kriterlerini sağlamaktadır.`;
      detailedExplanation = 'Şirket hem resmi Borsa İstanbul Katılım Tüm (XKTM) endeks listesinde yer almakta, hem de KAP Katılım Finansı İlkeleri Bilgi Formundaki hasılat (%5) ve borç/varlık (%33) kriter limitlerinin altındadır.';
    } else if (!isBistKatilimTumMember && hasFinancialViolation) {
      status = ComplianceStatus.NON_COMPLIANT;
      statusLabel = 'Katılım Kriterlerine Uygun Görünmüyor';
      statusBadgeVariant = 'danger';
      const failed = criteria.filter(c => !c.isPassed).map(c => c.name).join(', ');
      summaryReason = `BIST Katılım Tüm kapsamı dışındadır ve ${failed} kriter sınırlarını aşmaktadır.`;
      detailedExplanation = `Şirket BIST Katılım Tüm endeksinde yer almamaktadır ve son mali dönem verilerine göre şu kriterlerde limit aşımı tespit edilmiştir: ${failed}.`;
    } else if (isBistKatilimTumMember && hasFinancialViolation) {
      // Period gap: Included in index but latest financial disclosure shows violation
      status = ComplianceStatus.UNCERTAIN;
      statusLabel = 'Dönemsel Bildirim Farklılığı';
      statusBadgeVariant = 'warning';
      confidence = ConfidenceLevel.MEDIUM;
      summaryReason = 'Mevcut BIST Katılım Tüm listesinde yer alıyor ancak son KAP mali formunda kriter aşımı görünüyor. Bir sonraki endeks revizyonunda güncellenecektir.';
      detailedExplanation = 'Borsa İstanbul endeks listeleri 6 ayda bir güncellenir. Şirketin en son açıkladığı KAP bildiriminde bazı oranlar değişmiş olabilir.';
    } else if (!isBistKatilimTumMember && !hasFinancialViolation) {
      // Passes ratios but not in index (could be due to market cap, sector exclusion, or pending review)
      status = ComplianceStatus.UNCERTAIN;
      statusLabel = 'Oranlar Uygun / Endeks Dışında';
      statusBadgeVariant = 'warning';
      confidence = ConfidenceLevel.MEDIUM;
      summaryReason = 'KAP finansal oran kriterleri limit dahilindedir ancak hisse BIST Katılım Tüm endeksinde listelenmemiştir.';
      detailedExplanation = 'Şirketin finansal oranları TKBB eşiklerinin altındadır ancak şirket Borsa İstanbul Katılım Endeksleri seçim havuzunda yer almamış veya özel inceleme sürecinde olabilir.';
    }

    // Third party conflicts note
    const hasThirdPartyConflict = thirdPartyObservations.some(tp => tp.isCompliant !== (status === ComplianceStatus.COMPLIANT));
    if (hasThirdPartyConflict && status === ComplianceStatus.COMPLIANT) {
      detailedExplanation += ' (Not: Bazı 3. taraf analiz servisleri farklı hesaplama metodolojisi veya veri tarihi kullanıyor olabilir).';
    }

    return {
      instrument,
      status,
      statusLabel,
      statusBadgeVariant,
      summaryReason,
      detailedExplanation,
      confidence,
      ruleSetVersion: this.stockRules.version,
      ruleSetAuthority: this.stockRules.authority,
      asOf: nowIso,
      financialPeriod: financials?.financialPeriod,
      isCached: false,
      criteria,
      indices: evaluatedIndices,
      sources,
      disclaimer: STANDARD_LEGAL_DISCLAIMER
    };
  }

  /**
   * Evaluate a Mutual Fund against SPK & TKBB Fund rules
   */
  public evaluateFund(params: {
    instrument: InstrumentSummary;
    fundData?: RawFundData | null;
  }): ComplianceEvaluation {
    const { instrument, fundData } = params;
    const nowIso = new Date().toISOString();

    if (!fundData) {
      return {
        instrument,
        status: ComplianceStatus.INSUFFICIENT_DATA,
        statusLabel: 'Fon Bilgisi Yetersiz',
        statusBadgeVariant: 'neutral',
        summaryReason: 'Bu fon için TEFAS veya KAP resmi sınıflandırma kaydı bulunamadı.',
        confidence: ConfidenceLevel.LOW,
        ruleSetVersion: this.fundRules.version,
        ruleSetAuthority: this.fundRules.authority,
        asOf: nowIso,
        isCached: false,
        criteria: [],
        indices: [],
        sources: [],
        disclaimer: STANDARD_LEGAL_DISCLAIMER
      };
    }

    const umbrellaCategory = (fundData.umbrellaFundCategory || instrument.umbrellaFund || '').toLowerCase();
    const fundTypeStr = (fundData.fundType || instrument.fundType || '').toLowerCase();
    const fundNameStr = (fundData.fundName || instrument.name || '').toLowerCase();

    // Check if umbrella fund is Katılım Şemsiye Fonu
    const isKatilimUmbrella = umbrellaCategory.includes('katılım') || umbrellaCategory.includes('katilim');
    const isKatilimType = fundTypeStr.includes('katılım') || fundTypeStr.includes('katilim');
    const isKatilimName = fundNameStr.includes('katılım') || fundNameStr.includes('katilim') || fundNameStr.includes('kira sertifikası');

    const criteria: CriterionCheck[] = [];

    criteria.push({
      id: 'CRIT_FUND_UMBRELLA',
      name: 'Şemsiye Fon Türü',
      category: 'FUND_MANDATE',
      description: 'Fonun SPK tescilli bir "Katılım Şemsiye Fonu" altında kurulmuş olması.',
      actualValue: fundData.umbrellaFundCategory || 'Belirtilmemiş',
      actualFormatted: fundData.umbrellaFundCategory || 'Bilinmiyor',
      thresholdValue: 'Katılım Şemsiye Fonu',
      thresholdFormatted: 'Katılım Şemsiye Fonu',
      isPassed: isKatilimUmbrella,
      statusText: isKatilimUmbrella ? 'Katılım Şemsiye Fonu (Uygun)' : 'Konvansiyonel Şemsiye Fonu',
      note: isKatilimUmbrella ? 'SPK nezdinde Katılım Şemsiye Fonu olarak tescillidir.' : 'Katılım şemsiye fonu kapsamında değildir.'
    });

    criteria.push({
      id: 'CRIT_FUND_TYPE',
      name: 'TEFAS Fon Kategorisi',
      category: 'FUND_MANDATE',
      description: 'Fonun TEFAS platformundaki resmi katılım fonu sınıflandırması.',
      actualValue: fundData.fundType || 'Genel Fon',
      actualFormatted: fundData.fundType || 'Genel',
      thresholdValue: 'Katılım Esaslı Fon Türü',
      thresholdFormatted: 'Katılım Esaslı',
      isPassed: isKatilimType || isKatilimUmbrella,
      statusText: (isKatilimType || isKatilimUmbrella) ? 'Katılım Esaslı Fon' : 'Konvansiyonel Fon'
    });

    criteria.push({
      id: 'CRIT_FUND_SHARIA',
      name: 'Danışma Kurulu / İcazet Durumu',
      category: 'GOVERNANCE',
      description: 'Fon izahnamesinde katılım finans ilkelerine uygunluk ve danışma kurulu taahhüdü.',
      actualValue: fundData.hasShariaBoardApproval ? 'Onaylı İcazet Mevcut' : 'Belirtilmemiş',
      actualFormatted: fundData.hasShariaBoardApproval ? 'İcazet Belgeli' : (isKatilimUmbrella ? 'Mevzuat Gereği Katılım Esaslı' : 'Mevcut Değil'),
      thresholdValue: 'Katılım Esaslı İzahname',
      thresholdFormatted: 'Şer\'i Uyum Taahhüdü',
      isPassed: isKatilimUmbrella || (fundData.hasShariaBoardApproval ?? false),
      statusText: (isKatilimUmbrella || fundData.hasShariaBoardApproval) ? 'Uygun' : 'Taahhüt Bulunamadı'
    });

    const isCompliant = isKatilimUmbrella || (isKatilimType && isKatilimName);

    const sources: SourceProvenance[] = [];

    sources.push({
      sourceName: SourceName.TEFAS,
      tier: SourceTier.OFFICIAL_PRIMARY,
      title: 'TEFAS Türkiye Elektronik Fon Alım Satım Platformu',
      badgeText: isCompliant ? 'Katılım Fonu' : 'Standart Fon',
      isCompliantAccordingToSource: isCompliant,
      url: fundData.tefasUrl || `https://www.tefas.gov.tr/FonAnaliz.aspx?FonKod=${fundData.tefasCode}`,
      fetchedAt: nowIso
    });

    sources.push({
      sourceName: SourceName.KAP,
      tier: SourceTier.OFFICIAL_PRIMARY,
      title: 'KAP Fon Bilgilendirme ve İzahname',
      badgeText: fundData.umbrellaFundCategory || 'KAP Fon Kaydı',
      isCompliantAccordingToSource: isCompliant,
      url: fundData.prospectusUrl || `https://www.kap.org.tr/tr/fon-bilgileri/ozet/${fundData.tefasCode.toLowerCase()}`,
      fetchedAt: nowIso
    });

    return {
      instrument,
      status: isCompliant ? ComplianceStatus.COMPLIANT : ComplianceStatus.NON_COMPLIANT,
      statusLabel: isCompliant ? 'Katılım Esaslı Yatırım Fonu' : 'Katılım Fonu Kriterlerine Uygun Değil',
      statusBadgeVariant: isCompliant ? 'success' : 'danger',
      summaryReason: isCompliant
        ? `${fundData.tefasCode} kodlu fon resmi kayıtlarda "${fundData.umbrellaFundCategory || 'Katılım Şemsiye Fonu'}" altında yer almakta olup katılım esaslıdır.`
        : `${fundData.tefasCode} kodlu fon konvansiyonel (katılım dışı) portföy yönetimi kapsamındadır.`,
      detailedExplanation: isCompliant
        ? 'Bu yatırım fonu, portföyünü SPK ve TKBB standartlarına uygun katılım hisseleri, sukuk / kira sertifikaları ve katılma hesaplarında değerlendirmektedir.'
        : 'Fon izahnamesinde faizli enstrümanlar (tahvil, bono, mevduat) yer alabildiği için katılım fonu statüsünde değildir.',
      confidence: ConfidenceLevel.HIGH,
      ruleSetVersion: this.fundRules.version,
      ruleSetAuthority: this.fundRules.authority,
      asOf: nowIso,
      isCached: false,
      criteria,
      indices: [], // Funds do not participate in BIST stock indices
      sources,
      disclaimer: STANDARD_LEGAL_DISCLAIMER
    };
  }
}
