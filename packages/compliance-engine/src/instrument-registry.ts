import { InstrumentSummary, InstrumentType, ResolutionResult } from '@katilim/shared-types';
import { COMPANY_DIRECTORY } from './company-directory.js';
import { FUND_DIRECTORY } from './fund-directory.js';
import { CompanyIdentity, normalizeIdentity } from './live-data.js';

export interface FundIdentity extends CompanyIdentity { type: string }
export const KAP_FUNDS_DIRECTORY_URL='https://www.kap.org.tr/tr/YatirimFonlari/ALL';
export function asInstrument(row: CompanyIdentity | FundIdentity): InstrumentSummary {
 const type='type' in row && Object.values(InstrumentType).includes(row.type as InstrumentType) ? row.type as InstrumentType : InstrumentType.STOCK;
 return {id:`${type.toLowerCase()}-${row.symbol.toLowerCase()}`,symbol:row.symbol,name:row.name,type,kapUrl:row.kapUrl};
}

export function resolveInstrument(raw: string, sanitized: string, companies: CompanyIdentity[]=COMPANY_DIRECTORY, funds: FundIdentity[]=FUND_DIRECTORY): ResolutionResult {
 const scope=/^\s*(BIST|IST|BİST|FON|FUND|TEFAS)\s*:/i.exec(raw)?.[1].toUpperCase();
 const query=normalizeIdentity(sanitized.replace(/^(BIST|IST|BİST|FON|FUND|TEFAS)\s*:\s*/i,'').replace(/^(FON|FUND|TEFAS)\s+/i,''));
 const rows=scope && ['BIST','IST','BİST'].includes(scope) ? companies : scope ? funds : [...companies,...funds];
 const exact=rows.filter(r=>r.symbol===query);
 const fullQuery=normalizeIdentity(raw.replace(/^\s*(BIST|IST|BİST|FON|FUND|TEFAS)\s*:/i,''));
 const matches=exact.length?exact:rows.filter(r=>normalizeIdentity(r.name)===query || normalizeIdentity(r.name)===fullQuery || (!('type' in r) && normalizeIdentity(r.name.split(' ')[0])===query));
 const unique=[...new Map(matches.map(r=>[`${'type' in r?r.type:InstrumentType.STOCK}:${r.symbol}`,r])).values()];
 const base={originalQuery:raw,normalizedQuery:sanitized};
 if(unique.length===1) return {...base,isResolved:true,isAmbiguous:false,instrument:asInstrument(unique[0])};
 if(unique.length>1) return {...base,isResolved:false,isAmbiguous:true,candidates:unique.slice(0,8).map(r=>({...asInstrument(r),score:1}))};
 return {...base,isResolved:false,isAmbiguous:false};
}

export const instrumentQuery=(instrument: Pick<InstrumentSummary,'symbol'|'type'>) => `${instrument.type===InstrumentType.STOCK?'BIST':'FON'}:${instrument.symbol}`;
export function searchInstruments(query: string, companies: CompanyIdentity[]=COMPANY_DIRECTORY, funds: FundIdentity[]=FUND_DIRECTORY, limit=8): InstrumentSummary[] {
 const normalized=normalizeIdentity(query);
 if(!normalized) return [];
 return [...companies,...funds].filter(r=>normalizeIdentity(r.symbol+' '+r.name).includes(normalized)).sort((a,b)=>Number(b.symbol===normalized)-Number(a.symbol===normalized)).slice(0,limit).map(asInstrument);
}

export function parseFundDirectory(html: string): FundIdentity[] {
 const entries: FundIdentity[]=[];
 const strip=(s:string)=>s.replace(/<[^>]*>/g,' ').replace(/&amp;/g,'&').replace(/\s+/g,' ').trim();
 const markup=html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'');
 for(const row of markup.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/g)) {
  const links=[...row[1].matchAll(/<a\b[^>]*href="(\/tr\/fon-bilgileri\/ozet\/[a-z0-9-]+)"[^>]*>([\s\S]*?)<\/a>/g)];
  if(links.length<2) continue;
  const symbol=strip(links[0][2]),name=strip(links[1][2]);
  if(!/^[A-Z0-9]{3,6}$/.test(symbol)||!name) continue;
  entries.push({symbol,name,kapUrl:'https://www.kap.org.tr'+links[0][1],type:/EMEKLİLİK/i.test(name)?InstrumentType.PENSION_FUND:/BORSA YATIRIM FONU/i.test(name)?InstrumentType.ETF:InstrumentType.MUTUAL_FUND});
 }
 if(entries.length<100) throw new Error('KAP fon dizini doğrulanamadı.');
 return [...new Map(entries.map(r=>[r.symbol,r])).values()];
}
