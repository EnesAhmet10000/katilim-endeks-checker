import { checkLiveInstrument, unverifiedEvaluation, resolveCompany } from '@katilim/compliance-engine';
import {
  ComplianceCheckResponse,
  ComplianceEvaluation,
  ComplianceStatus,
  ConfidenceLevel,
  InstrumentType
} from '@katilim/shared-types';
import { ComplianceEngine, STANDARD_LEGAL_DISCLAIMER } from '@katilim/compliance-engine';
import { EntityResolverService } from './entity-resolver.service.js';
import { CacheService } from './cache.service.js';

export class ComplianceService {
  private entityResolver: EntityResolverService;
  private cache: CacheService;

  constructor() {
    this.entityResolver = new EntityResolverService();
    this.cache = new CacheService();
  }

  /**
   * Check compliance for a query string (ticker, name, alias, fund code)
   */
  public async check(query: string, forceRefresh: boolean = false): Promise<ComplianceCheckResponse> {
    const startTime = performance.now();

    // 1. Resolve Instrument
    const resolution = this.entityResolver.resolve(query);

    if (!resolution.isResolved || !resolution.instrument) {
      return {
        success: true,
        resolution,
        executionTimeMs: Math.round(performance.now() - startTime)
      };
    }

    const instrument = resolution.instrument;
    const cacheKey = `COMPLIANCE_${instrument.type}_${instrument.symbol}`;

    // 2. Check Cache if not forced refresh
    if (!forceRefresh) {
      const cached = this.cache.get(cacheKey);
      if (cached.data && !cached.isStale) {
        return {
          success: true,
          resolution,
          evaluation: cached.data,
          executionTimeMs: Math.round(performance.now() - startTime)
        };
      }
    }

    // 3. Evaluate according to instrument type
    let evaluation: ComplianceEvaluation;

    evaluation = await checkLiveInstrument(instrument);

    // 4. Save to Cache
    if (evaluation.asOf) this.cache.set(cacheKey, evaluation, 60 * 60 * 1000);

    return {
      success: true,
      resolution,
      evaluation,
      executionTimeMs: Math.round(performance.now() - startTime)
    };
  }

  /**
   * Search for Autocomplete
   */
  public search(query: string, limit: number = 8) {
    return this.entityResolver.search(query, limit);
  }

  /**
   * Get health of all adapters & cache
   */
  public getHealth() {
    return {
      bist: { isHealthy: false, status: 'not-connected', lastChecked: null },
      kap: { isHealthy: false, status: 'on-demand', lastChecked: null },
      tefas: { isHealthy: false, status: 'not-connected', lastChecked: null },
      thirdParty: { isHealthy: false, status: 'not-connected', lastChecked: null },
      cache: this.cache.getStats()
    };
  }
}
