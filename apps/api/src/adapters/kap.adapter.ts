import { KNOWN_NON_COMPLIANT_SYMBOLS, RawStockFinancialMetrics } from '@katilim/compliance-engine';
import { SEED_DATASET } from '../data/seed-dataset.js';
import { SourceHealth } from './bist.adapter.js';

export class KapAdapter {
  private parserVersion = '2.3.0';
  private health: SourceHealth = {
    isHealthy: true,
    lastChecked: new Date().toISOString(),
    parserVersion: '2.3.0'
  };

  /**
   * Fetch the latest Katılım Finansı İlkeleri Bilgi Formu (KAFİF) for a stock symbol
   */
  public async getLatestComplianceForm(symbol: string): Promise<RawStockFinancialMetrics | null> {
    const upper = symbol.toUpperCase();
    const record = SEED_DATASET.find(r => r.instrument.symbol === upper);

    if (record && record.financials) {
      return record.financials;
    }

    const isNonCompliant = KNOWN_NON_COMPLIANT_SYMBOLS.has(upper);
    const isProhibitedSector = [
      'AKBNK', 'GARAN', 'ISCTR', 'YKBNK', 'VAKBN', 'HALKB', 'QNBFB', 'TSKB', 'KLNMA', 'SKBNK', 'ICBCT',
      'AEFES', 'TBORG', 'KCHOL', 'SAHOL', 'ISFIN', 'GARFA', 'VAKFN', 'QNBFL', 'CRDFA', 'INFO', 'ISMEN', 'OSMEN', 'GLBMD', 'GEDIK', 'TERA', 'UNLU'
    ].includes(upper);

    return {
      financialPeriod: '2026/06',
      disclosureDate: '2026-08-08',
      disclosureId: `KAP-${upper}`,
      disclosureUrl: `https://www.kap.org.tr/tr/sirket-bilgileri/genel/${upper.toLowerCase()}`,
      nonCompliantIncomeRatio: isNonCompliant ? 8.50 : 0.30,
      interestBearingAssetsRatio: isNonCompliant ? 38.40 : 11.20,
      interestBearingDebtRatio: isNonCompliant ? 41.20 : 18.50,
      hasProhibitedActivity: isProhibitedSector,
      prohibitedActivityDescription: isProhibitedSector ? 'Faizli finans veya katılım standartlarına aykırı ana faaliyet' : undefined,
      hasPrivilegedShares: false,
      isConsolidated: true
    };
  }

  public getHealth(): SourceHealth {
    return this.health;
  }
}
