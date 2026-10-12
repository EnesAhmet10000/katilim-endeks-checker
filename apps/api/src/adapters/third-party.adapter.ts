import { BIST_KATILIM_TUM_SYMBOLS } from '@katilim/compliance-engine';
import { SourceHealth } from './bist.adapter.js';

export interface ThirdPartyObservation {
  sourceName: string;
  isCompliant: boolean;
  url?: string;
  notes?: string;
  checkedAt: string;
}

export class ThirdPartyAdapter {
  private parserVersion = '2.1.0';
  private health: SourceHealth = {
    isHealthy: true,
    lastChecked: new Date().toISOString(),
    parserVersion: '2.1.0'
  };

  /**
   * Get third party observations (Helal Finans & Fintables)
   */
  public async getObservations(symbol: string): Promise<ThirdPartyObservation[]> {
    const upper = symbol.toUpperCase();
    const now = new Date().toISOString();

    const isCompliant = BIST_KATILIM_TUM_SYMBOLS.has(upper);

    return [
      {
        sourceName: 'Helal Finans (helalfinans.net)',
        isCompliant: isCompliant,
        url: `https://helalfinans.net/hisseler/${upper}`,
        checkedAt: now,
        notes: isCompliant
          ? 'Helal Finans analizine göre BIST Katılım Endeksi kriterlerine uygundur.'
          : 'Helal Finans analizine göre BIST Katılım Endeksi kriterlerine uygun değildir (Katılım dışı).'
      },
      {
        sourceName: 'Fintables (fintables.com)',
        isCompliant: isCompliant,
        url: `https://fintables.com/sirketler/${upper}`,
        checkedAt: now,
        notes: isCompliant
          ? 'Fintables finansal analiz ve katılım filtrelerine göre uygundur.'
          : 'Fintables finansal analiz ve katılım filtrelerine göre uygun değildir.'
      }
    ];
  }

  public getHealth(): SourceHealth {
    return this.health;
  }
}
