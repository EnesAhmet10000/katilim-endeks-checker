import { COMPANY_DIRECTORY, resolveCompany, unverifiedEvaluation } from '@katilim/compliance-engine';
import {
  ComplianceCheckResponse,
  ComplianceEvaluation,
  ComplianceStatus,
  ConfidenceLevel,
  DisambiguationCandidate,
  InstrumentSummary,
  InstrumentType,
  ResolutionResult
} from '@katilim/shared-types';
import {
  BIST_KATILIM_100_SYMBOLS,
  BIST_KATILIM_30_SYMBOLS,
  BIST_KATILIM_50_SYMBOLS,
  BIST_KATILIM_TUM_SYMBOLS,
  COMPREHENSIVE_DATASET,
  ComplianceEngine,
  KNOWN_NON_COMPLIANT_SYMBOLS,
  SeedInstrumentRecord,
  STANDARD_LEGAL_DISCLAIMER
} from '@katilim/compliance-engine';

export class LocalComplianceEvaluator {
  private engine: ComplianceEngine;
  private dataset: SeedInstrumentRecord[];

  constructor() {
    this.engine = new ComplianceEngine();
    this.dataset = COMPREHENSIVE_DATASET;
  }

  public sanitizeQuery(rawText: string): string {
    if (!rawText) return '';
    let text = rawText.trim();
    text = text.replace(/<[^>]*>?/gm, '');
    text = text.replace(/[#@]/g, ' '); // Strip hashtags and mentions (e.g. #ardyz -> ardyz)
    text = text.replace(/\b\d+([.,]\d+)?\s*(TL|TRY|₺|USD|\$|EUR|€)\b/gi, '');
    text = text.replace(/\b(TL|TRY|₺|USD|\$|EUR|€)\s*\d+([.,]\d+)?\b/gi, '');
    text = text.replace(/[₺$€]/g, '');
    text = text.replace(/^(BIST|IST|BİST|IS)\s*:\s*/i, '');
    text = text.replace(/\.(E|IS|TI)$/i, '');
    text = text.replace(/\b(hissesi|hisse|payı|pay|fonu|fon|senetleri|senedi|fiyatı)\b/gi, '');
    text = text.replace(/[()[\]{},:;*–—_"\']/g, ' ');
    return text.replace(/\s+/g, ' ').trim();
  }

  public normalizeTurkish(str: string): string {
    return str
      .replace(/İ/g, 'i')
      .replace(/I/g, 'ı')
      .toLowerCase()
      .replace(/ı/g, 'i')
      .replace(/ğ/g, 'g')
      .replace(/ü/g, 'u')
      .replace(/ş/g, 's')
      .replace(/ö/g, 'o')
      .replace(/ç/g, 'c')
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  public resolve(rawQuery: string): ResolutionResult {
    const sanitized = this.sanitizeQuery(rawQuery);
    if (!sanitized) {
      return { isResolved: false, isAmbiguous: false, originalQuery: rawQuery, normalizedQuery: '' };
    }

    const official = resolveCompany(sanitized);
    if (official) return { isResolved: true, instrument: official, isAmbiguous: false, originalQuery: rawQuery, normalizedQuery: sanitized };
    const normQuery = this.normalizeTurkish(sanitized);
    const upperQuery = sanitized.toUpperCase().replace(/[^A-Z0-9]/g, '');

    // 1. Exact Symbol match in curated dataset
    for (const record of this.dataset) {
      if (record.instrument.symbol.toUpperCase() === upperQuery) {
        return { isResolved: true, instrument: record.instrument, isAmbiguous: false, originalQuery: rawQuery, normalizedQuery: sanitized };
      }
    }

    // 2. Exact Symbol in BIST Master Katılım list (e.g. DOFRB, ATATP, ARDYZ, LOGO, BOSSA, EGEEN...)
    if (upperQuery.length >= 3 && upperQuery.length <= 6 && BIST_KATILIM_TUM_SYMBOLS.has(upperQuery)) {
      return {
        isResolved: true,
        instrument: {
          id: upperQuery.toLowerCase(),
          symbol: upperQuery,
          name: `${upperQuery} BIST Katılım Şirketi`,
          shortName: upperQuery,
          type: InstrumentType.STOCK,
          sector: 'BIST Katılım Tüm Şirketleri'
        },
        isAmbiguous: false,
        originalQuery: rawQuery,
        normalizedQuery: sanitized
      };
    }

    // 3. Exact Name match
    for (const record of this.dataset) {
      const normName = this.normalizeTurkish(record.instrument.name);
      const normShort = record.instrument.shortName ? this.normalizeTurkish(record.instrument.shortName) : '';
      if (normName === normQuery || (normShort && normShort === normQuery)) {
        return { isResolved: true, instrument: record.instrument, isAmbiguous: false, originalQuery: rawQuery, normalizedQuery: sanitized };
      }
    }

    // 4. Exact Alias match
    for (const record of this.dataset) {
      for (const alias of record.aliases) {
        if (this.normalizeTurkish(alias) === normQuery) {
          return { isResolved: true, instrument: record.instrument, isAmbiguous: false, originalQuery: rawQuery, normalizedQuery: sanitized };
        }
      }
    }

    // 5. Valid 3-6 letter stock ticker generic fallback
    if (/^[A-Z]{3,6}$/.test(upperQuery)) {
      const isKatilim = BIST_KATILIM_TUM_SYMBOLS.has(upperQuery) && !KNOWN_NON_COMPLIANT_SYMBOLS.has(upperQuery);
      return {
        isResolved: true,
        instrument: {
          id: upperQuery.toLowerCase(),
          symbol: upperQuery,
          name: `${upperQuery} Pay Senedi`,
          shortName: upperQuery,
          type: InstrumentType.STOCK,
          sector: isKatilim ? 'BIST Katılım Kapsamında' : 'BIST Katılım Dışı'
        },
        isAmbiguous: false,
        originalQuery: rawQuery,
        normalizedQuery: sanitized
      };
    }

    // 6. Fuzzy & Substring candidates
    const candidates: DisambiguationCandidate[] = [];
    for (const record of this.dataset) {
      const normName = this.normalizeTurkish(record.instrument.name);
      const normShort = record.instrument.shortName ? this.normalizeTurkish(record.instrument.shortName) : '';
      const symbolNorm = this.normalizeTurkish(record.instrument.symbol);

      let maxScore = 0;
      if (symbolNorm.startsWith(normQuery) || normQuery.startsWith(symbolNorm)) maxScore = Math.max(maxScore, 0.90);
      if (normName.includes(normQuery) || (normShort && normShort.includes(normQuery))) maxScore = Math.max(maxScore, 0.85);

      for (const alias of record.aliases) {
        const normAlias = this.normalizeTurkish(alias);
        if (normAlias.includes(normQuery) || normQuery.includes(normAlias)) maxScore = Math.max(maxScore, 0.82);
      }

      if (maxScore >= 0.60) {
        candidates.push({
          symbol: record.instrument.symbol,
          name: record.instrument.name,
          type: record.instrument.type,
          score: maxScore
        });
      }
    }

    candidates.sort((a, b) => b.score - a.score);

    if (candidates.length === 1 && candidates[0].score >= 0.75) {
      const match = this.dataset.find(o => o.instrument.symbol === candidates[0].symbol);
      if (match) {
        return { isResolved: true, instrument: match.instrument, isAmbiguous: false, originalQuery: rawQuery, normalizedQuery: sanitized };
      }
    }

    if (candidates.length > 0) {
      return { isResolved: false, isAmbiguous: true, candidates: candidates.slice(0, 5), originalQuery: rawQuery, normalizedQuery: sanitized };
    }

    return { isResolved: false, isAmbiguous: false, originalQuery: rawQuery, normalizedQuery: sanitized };
  }

  public evaluateDirect(query: string): ComplianceCheckResponse {
    const startTime = performance.now();
    const resolution = this.resolve(query);

    if (!resolution.isResolved || !resolution.instrument) {
      return {
        success: true,
        resolution,
        executionTimeMs: Math.round(performance.now() - startTime)
      };
    }

    return {success:true,resolution,evaluation:unverifiedEvaluation(resolution.instrument),executionTimeMs:Math.round(performance.now()-startTime)};
  }

  public search(query: string, limit: number = 8): InstrumentSummary[] {
    const sanitized = this.sanitizeQuery(query);
    if (!sanitized) return [];
    const officialMatches = COMPANY_DIRECTORY.filter(r => this.normalizeTurkish(r.symbol).includes(this.normalizeTurkish(sanitized)) || this.normalizeTurkish(r.name).includes(this.normalizeTurkish(sanitized))).slice(0, limit).map(r => resolveCompany(r.symbol)!);
    if (officialMatches.length) return officialMatches;

    const norm = this.normalizeTurkish(sanitized);
    const upper = sanitized.toUpperCase();
    const matches: { item: InstrumentSummary; score: number }[] = [];

    for (const record of this.dataset) {
      let score = 0;
      const inst = record.instrument;
      const normName = this.normalizeTurkish(inst.name);
      const normShort = inst.shortName ? this.normalizeTurkish(inst.shortName) : '';

      if (inst.symbol.toUpperCase() === upper) score = 100;
      else if (inst.symbol.toUpperCase().startsWith(upper)) score = 90;
      else if (normName.startsWith(norm) || normShort.startsWith(norm)) score = 80;
      else if (normName.includes(norm) || normShort.includes(norm)) score = 70;
      else {
        for (const alias of record.aliases) {
          if (this.normalizeTurkish(alias).includes(norm)) {
            score = 60;
            break;
          }
        }
      }

      if (score > 0) matches.push({ item: inst, score });
    }

    // Also search BIST Katılım Master symbols
    if (upper.length >= 2) {
      for (const sym of BIST_KATILIM_TUM_SYMBOLS) {
        if (sym.startsWith(upper) && !matches.some(m => m.item.symbol === sym)) {
          matches.push({
            item: {
              id: sym.toLowerCase(),
              symbol: sym,
              name: `${sym} (BIST Katılım Tüm)`,
              type: InstrumentType.STOCK
            },
            score: 75
          });
        }
      }
    }

    matches.sort((a, b) => b.score - a.score);
    return matches.slice(0, limit).map(m => m.item);
  }
}
