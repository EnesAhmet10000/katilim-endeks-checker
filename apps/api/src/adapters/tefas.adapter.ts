import { RawFundData } from '@katilim/compliance-engine';
import { SEED_DATASET } from '../data/seed-dataset.js';
import { SourceHealth } from './bist.adapter.js';

export class TefasAdapter {
  private parserVersion = '1.1.0';
  private health: SourceHealth = {
    isHealthy: true,
    lastChecked: new Date().toISOString(),
    parserVersion: '1.1.0'
  };

  /**
   * Fetch fund metadata and umbrella category from TEFAS
   */
  public async getFundData(fundCode: string): Promise<RawFundData | null> {
    const upper = fundCode.toUpperCase();
    const record = SEED_DATASET.find(r => r.instrument.symbol === upper);

    if (record && record.fundData) {
      return record.fundData;
    }

    return null;
  }

  public getHealth(): SourceHealth {
    return this.health;
  }
}
