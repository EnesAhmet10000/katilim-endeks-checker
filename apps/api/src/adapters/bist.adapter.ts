import {
  BIST_KATILIM_100_SYMBOLS,
  BIST_KATILIM_30_SYMBOLS,
  BIST_KATILIM_50_SYMBOLS,
  BIST_KATILIM_TUM_SYMBOLS,
  KNOWN_NON_COMPLIANT_SYMBOLS,
  RawIndexMembershipRecord
} from '@katilim/compliance-engine';
import { SEED_DATASET } from '../data/seed-dataset.js';

export interface SourceHealth {
  isHealthy: boolean;
  lastChecked: string;
  errorMessage?: string;
  parserVersion: string;
}

export class BistAdapter {
  private parserVersion = '2.3.0';
  private health: SourceHealth = {
    isHealthy: true,
    lastChecked: new Date().toISOString(),
    parserVersion: '2.3.0'
  };

  /**
   * Fetch Index memberships for a given stock symbol
   */
  public async getIndexMemberships(symbol: string): Promise<RawIndexMembershipRecord[]> {
    const upper = symbol.toUpperCase();
    const record = SEED_DATASET.find(r => r.instrument.symbol === upper);

    if (record && record.indices) {
      return record.indices;
    }

    const isNonCompliant = KNOWN_NON_COMPLIANT_SYMBOLS.has(upper) || !BIST_KATILIM_TUM_SYMBOLS.has(upper);
    const isKatilimTum = !isNonCompliant && BIST_KATILIM_TUM_SYMBOLS.has(upper);
    const isKatilim100 = !isNonCompliant && BIST_KATILIM_100_SYMBOLS.has(upper);
    const isKatilim50 = !isNonCompliant && BIST_KATILIM_50_SYMBOLS.has(upper);
    const isKatilim30 = !isNonCompliant && BIST_KATILIM_30_SYMBOLS.has(upper);

    return [
      { indexCode: 'XKTM', indexName: 'BIST Katılım Tüm', isIncluded: isKatilimTum, period: '2026/05 - 2026/10' },
      { indexCode: 'XKT100', indexName: 'BIST Katılım 100', isIncluded: isKatilim100, period: '2026/05 - 2026/10' },
      { indexCode: 'XKT50', indexName: 'BIST Katılım 50', isIncluded: isKatilim50, period: '2026/05 - 2026/10' },
      { indexCode: 'XKT30', indexName: 'BIST Katılım 30', isIncluded: isKatilim30, period: '2026/05 - 2026/10' }
    ];
  }

  public getHealth(): SourceHealth {
    return this.health;
  }
}
