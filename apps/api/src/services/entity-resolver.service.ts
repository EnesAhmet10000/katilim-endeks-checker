import { resolveInstrument, searchInstruments } from '@katilim/compliance-engine';
import { InstrumentSummary, ResolutionResult } from '@katilim/shared-types';

export class EntityResolverService {
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


 public resolve(query: string): ResolutionResult { return resolveInstrument(query,this.sanitizeQuery(query)); }
 public search(query: string, limit=8): InstrumentSummary[] { return searchInstruments(this.sanitizeQuery(query),undefined,undefined,limit); }
}
