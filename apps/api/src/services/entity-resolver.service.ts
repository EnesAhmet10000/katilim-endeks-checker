import { resolveCompany } from '@katilim/compliance-engine';
import { resolveInstrument, searchInstruments } from '@katilim/compliance-engine';
import {
  DisambiguationCandidate,
  InstrumentSummary,
  InstrumentType,
  ResolutionResult
} from '@katilim/shared-types';
import { BIST_KATILIM_TUM_SYMBOLS } from '@katilim/compliance-engine';
import { SEED_DATASET, SeedInstrumentRecord } from '../data/seed-dataset.js';

export class EntityResolverService {
  private registry: SeedInstrumentRecord[];

  constructor(customRegistry: SeedInstrumentRecord[] = SEED_DATASET) {
    this.registry = customRegistry;
  }

  /**
   * Cleans selected text by removing tickers prefixes, currencies, price tags, and common terms
   */
  public sanitizeQuery(rawText: string): string {
    if (!rawText) return '';

    let text = rawText.trim();

    // Remove code block / markdown / html artefacts
    text = text.replace(/<[^>]*>?/gm, '');

    // Strip hashtags and mentions (e.g. #ardyz -> ardyz, @thyao -> thyao)
    text = text.replace(/[#@]/g, ' ');

    // Remove price formats: e.g. "285.50 TL", "150,20 ₺", "45 TRY", "12.5$"
    text = text.replace(/\b\d+([.,]\d+)?\s*(TL|TRY|₺|USD|\$|EUR|€)\b/gi, '');
    text = text.replace(/\b(TL|TRY|₺|USD|\$|EUR|€)\s*\d+([.,]\d+)?\b/gi, '');

    // Remove standalone currency symbols
    text = text.replace(/[₺$€]/g, '');

    // Remove prefixes: "BIST:", "IST:", "BİST:", "IS:"
    text = text.replace(/^(BIST|IST|BİST|IS)\s*:\s*/i, '');

    // Remove suffixes: ".E", ".IS", ".TI"
    text = text.replace(/\.(E|IS|TI)$/i, '');

    // Remove noisy keywords: "hissesi", "hisse", "payı", "pay", "fonu", "fon", "senetleri"
    text = text.replace(/\b(hissesi|hisse|payı|pay|fonu|fon|senetleri|senedi|fiyatı)\b/gi, '');

    // Remove punctuation & brackets: ()[]{},:;*-_"
    text = text.replace(/[()[\]{},:;*–—_"\']/g, ' ');

    // Normalize multiple spaces
    text = text.replace(/\s+/g, ' ').trim();

    return text;
  }

  /**
   * Turkish lowercase normalization
   */
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

  /**
   * Levenshtein Distance for typo tolerance
   */
  private levenshteinDistance(a: string, b: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[b.length][a.length];
  }

  /**
   * Resolves selected user query into an exact InstrumentSummary or disambiguation candidates
   */
  public resolve(rawQuery: string): ResolutionResult {
    const sanitized = this.sanitizeQuery(rawQuery);
    if (!sanitized) {
      return {
        isResolved: false,
        isAmbiguous: false,
        originalQuery: rawQuery,
        normalizedQuery: ''
      };
    }

    const official = resolveInstrument(rawQuery,sanitized);
    if (official.isResolved || official.isAmbiguous) return official;
    const normQuery = this.normalizeTurkish(sanitized);
    const upperQuery = sanitized.toUpperCase().replace(/[^A-Z0-9]/g, '');

    // 1. Exact Symbol / ISIN Match in curated dataset
    for (const record of this.registry) {
      const sym = record.instrument.symbol.toUpperCase();
      const isin = record.instrument.isin?.toUpperCase();

      if (sym === upperQuery || (isin && isin === upperQuery)) {
        return {
          isResolved: true,
          instrument: record.instrument,
          isAmbiguous: false,
          originalQuery: rawQuery,
          normalizedQuery: sanitized
        };
      }
    }

    // 2. Exact Symbol in BIST Master Katılım list (e.g. ATATP, ARDYZ, LOGO, BOSSA, EGEEN...)
    if (upperQuery.length >= 3 && upperQuery.length <= 6 && BIST_KATILIM_TUM_SYMBOLS.has(upperQuery)) {
      return {
        isResolved: true,
        instrument: {
          id: upperQuery.toLowerCase(),
          symbol: upperQuery,
          name: `${upperQuery} Pay Senedi`,
          shortName: upperQuery,
          type: InstrumentType.STOCK,
          sector: 'BIST Katılım Tüm Şirketleri'
        },
        isAmbiguous: false,
        originalQuery: rawQuery,
        normalizedQuery: sanitized
      };
    }

    // 3. Exact Name Match (Normalized)
    for (const record of this.registry) {
      const normName = this.normalizeTurkish(record.instrument.name);
      const normShort = record.instrument.shortName
        ? this.normalizeTurkish(record.instrument.shortName)
        : '';

      if (normName === normQuery || (normShort && normShort === normQuery)) {
        return {
          isResolved: true,
          instrument: record.instrument,
          isAmbiguous: false,
          originalQuery: rawQuery,
          normalizedQuery: sanitized
        };
      }
    }

    // 4. Exact Alias Match
    for (const record of this.registry) {
      for (const alias of record.aliases) {
        if (this.normalizeTurkish(alias) === normQuery) {
          return {
            isResolved: true,
            instrument: record.instrument,
            isAmbiguous: false,
            originalQuery: rawQuery,
            normalizedQuery: sanitized
          };
        }
      }
    }

    // 5. Valid 4-5 letter stock ticker generic fallback
    if (/^[A-Z]{4,5}$/.test(upperQuery)) {
      const isKatilim = BIST_KATILIM_TUM_SYMBOLS.has(upperQuery);
      return {
        isResolved: true,
        instrument: {
          id: upperQuery.toLowerCase(),
          symbol: upperQuery,
          name: `${upperQuery} Pay Senedi`,
          shortName: upperQuery,
          type: InstrumentType.STOCK,
          sector: isKatilim ? 'BIST Katılım Kapsamında' : 'Borsa İstanbul'
        },
        isAmbiguous: false,
        originalQuery: rawQuery,
        normalizedQuery: sanitized
      };
    }

    // 6. Fuzzy & Substring Match / Disambiguation Candidates
    const candidates: DisambiguationCandidate[] = [];

    for (const record of this.registry) {
      const inst = record.instrument;
      const normName = this.normalizeTurkish(inst.name);
      const normShort = inst.shortName ? this.normalizeTurkish(inst.shortName) : '';
      const symbolNorm = this.normalizeTurkish(inst.symbol);

      let maxScore = 0;

      // Symbol prefix / substring match
      if (symbolNorm.startsWith(normQuery) || normQuery.startsWith(symbolNorm)) {
        maxScore = Math.max(maxScore, 0.90);
      }

      // Name contains query
      if (normName.includes(normQuery) || (normShort && normShort.includes(normQuery))) {
        maxScore = Math.max(maxScore, 0.85);
      }

      // Query contains name
      if (normQuery.includes(normName) && normName.length > 3) {
        maxScore = Math.max(maxScore, 0.80);
      }

      // Alias contains or matches
      for (const alias of record.aliases) {
        const normAlias = this.normalizeTurkish(alias);
        if (normAlias.includes(normQuery) || normQuery.includes(normAlias)) {
          maxScore = Math.max(maxScore, 0.82);
        }
      }

      // Typo tolerance (Levenshtein) on short names and symbols if length > 3
      if (normQuery.length > 3 && symbolNorm.length > 3) {
        const dist = this.levenshteinDistance(normQuery, symbolNorm);
        if (dist <= 1) {
          maxScore = Math.max(maxScore, 0.88);
        }
      }

      if (maxScore >= 0.60) {
        candidates.push({
          symbol: inst.symbol,
          name: inst.name,
          type: inst.type,
          score: Number(maxScore.toFixed(2))
        });
      }
    }

    // Sort descending by score
    candidates.sort((a, b) => b.score - a.score);

    // If top candidate is very high and significantly distinct, resolve it
    if (candidates.length === 1 && candidates[0].score >= 0.75) {
      const singleMatch = this.registry.find(r => r.instrument.symbol === candidates[0].symbol);
      if (singleMatch) {
        return {
          isResolved: true,
          instrument: singleMatch.instrument,
          isAmbiguous: false,
          originalQuery: rawQuery,
          normalizedQuery: sanitized
        };
      }
    }

    if (candidates.length > 1 && candidates[0].score >= 0.85 && (candidates[0].score - candidates[1].score) > 0.15) {
      const bestMatch = this.registry.find(r => r.instrument.symbol === candidates[0].symbol);
      if (bestMatch) {
        return {
          isResolved: true,
          instrument: bestMatch.instrument,
          isAmbiguous: false,
          originalQuery: rawQuery,
          normalizedQuery: sanitized
        };
      }
    }

    // Ambiguous candidates found
    if (candidates.length > 0) {
      return {
        isResolved: false,
        isAmbiguous: true,
        candidates: candidates.slice(0, 5),
        originalQuery: rawQuery,
        normalizedQuery: sanitized
      };
    }

    // Unresolved
    return {
      isResolved: false,
      isAmbiguous: false,
      originalQuery: rawQuery,
      normalizedQuery: sanitized
    };
  }

  /**
   * Autocomplete search for instruments by query
   */
  public search(query: string, limit: number = 8): InstrumentSummary[] {
    const officialMatches=searchInstruments(query,undefined,undefined,limit);
    if(officialMatches.length) return officialMatches;
    const sanitized = this.sanitizeQuery(query);
    if (!sanitized) return [];

    const norm = this.normalizeTurkish(sanitized);
    const upper = sanitized.toUpperCase();
    const matches: { item: InstrumentSummary; score: number }[] = [];

    for (const record of this.registry) {
      let score = 0;
      const inst = record.instrument;
      const normName = this.normalizeTurkish(inst.name);
      const normShort = inst.shortName ? this.normalizeTurkish(inst.shortName) : '';

      if (inst.symbol.toUpperCase() === upper) {
        score = 100;
      } else if (inst.symbol.toUpperCase().startsWith(upper)) {
        score = 90;
      } else if (normName.startsWith(norm) || normShort.startsWith(norm)) {
        score = 80;
      } else if (normName.includes(norm) || normShort.includes(norm)) {
        score = 70;
      } else {
        for (const alias of record.aliases) {
          if (this.normalizeTurkish(alias).includes(norm)) {
            score = 60;
            break;
          }
        }
      }

      if (score > 0) {
        matches.push({ item: inst, score });
      }
    }

    // Also search in BIST Katılım Tüm constituents
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
