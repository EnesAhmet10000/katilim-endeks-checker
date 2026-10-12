import { ComplianceEvaluation, ComplianceStatus, ConfidenceLevel, InstrumentSummary, InstrumentType, SourceName, SourceTier } from '@katilim/shared-types';
import { COMPANY_DIRECTORY } from './company-directory.js';

export interface CompanyIdentity { symbol: string; name: string; kapUrl: string }
export const KAP_DIRECTORY_URL = 'https://www.kap.org.tr/tr/bist-sirketler';
export const normalizeIdentity = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ı/g, 'i').toUpperCase().replace(/[^A-Z0-9]/g, '');
export const htmlText = (s: string) => s.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '').replace(/<[^>]*>/g, ' ').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n))).replace(/\s+/g, ' ').trim();

export function parseCompanyDirectory(html: string): CompanyIdentity[] {
 const grouped = new Map<string, { symbols: string[]; name: string }>();
 for (const m of html.matchAll(/<a\b[^>]*href="(\/tr\/sirket-bilgileri\/ozet\/\d+-[a-z0-9-]+)"[^>]*>([\s\S]*?)<\/a>/g)) {
  const text=htmlText(m[2]); const row=grouped.get(m[1])||{symbols:[],name:''};
  if (/^[A-Z0-9]{3,6}(?:\s+[A-Z0-9]{3,6})*$/.test(text)) row.symbols=text.split(/\s+/); else row.name=text;
  grouped.set(m[1],row);
 }
 const entries=[...grouped.entries()].filter(([,r])=>r.symbols.length&&r.name).flatMap(([path,r])=>r.symbols.map(symbol=>({symbol,name:r.name,kapUrl:'https://www.kap.org.tr'+path})));
 if(entries.length<100) throw new Error('KAP şirket dizini doğrulanamadı.');
 return entries;
}

export function resolveCompany(query: string, directory: CompanyIdentity[] = COMPANY_DIRECTORY): InstrumentSummary | undefined {
 const normalized=normalizeIdentity(query);
 const exact=directory.find(r=>r.symbol===normalized);
 const matches=exact ? [exact] : directory.filter(r=>normalizeIdentity(r.name)===normalized || normalizeIdentity(r.name.split(' ')[0])===normalized);
 const unique=[...new Map(matches.map(r=>[r.symbol,r])).values()];
 if(unique.length!==1) return undefined;
 const r=unique[0];
 return {id:r.symbol.toLowerCase(),symbol:r.symbol,name:r.name,type:InstrumentType.STOCK,kapUrl:r.kapUrl};
}

export function sourceLinks(instrument: InstrumentSummary) {
 const symbol=instrument.symbol;
 const kap=instrument.kapUrl && /^https:\/\/www\.kap\.org\.tr\/tr\/sirket-bilgileri\/ozet\/\d+-[a-z0-9-]+$/.test(instrument.kapUrl) ? instrument.kapUrl : KAP_DIRECTORY_URL;
 return {kap, helalFinans:`https://helalfinans.net/hisseler/${encodeURIComponent(symbol)}`,fintables:`https://fintables.com/sirketler/${encodeURIComponent(symbol)}`};
}

export function unverifiedEvaluation(instrument: InstrumentSummary): ComplianceEvaluation {
 return {instrument,status:ComplianceStatus.INSUFFICIENT_DATA,statusLabel:'Güncel veri doğrulanamadı',statusBadgeVariant:'warning',summaryReason:'Güncel resmi kaynak doğrulanamadı. Kayıtlı örnek oranlar ve endeks listeleri değerlendirmede kullanılmaz.',confidence:ConfidenceLevel.LOW,ruleSetVersion:'N/A',ruleSetAuthority:'KAP',asOf:'',isCached:false,criteria:[],indices:[],sources:[],disclaimer:'Bu bilgi yatırım tavsiyesi veya dini fetva değildir. Endeks üyeliği tek başına tam uygunluk değerlendirmesi değildir.'};
}

export function parseKapMembership(html: string, instrument: InstrumentSummary, checkedAt: string): ComplianceEvaluation {
 // Only server-rendered markup is read. Script data and navigation are excluded.
 const markup=html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
 const text=htmlText(markup);
 if (!new RegExp(`(?:^|\\s)${instrument.symbol}(?:\\s|$)`).test(text)) throw new Error('KAP şirket kimliği eşleşmedi.');
 const section=markup.match(/<h3\b[^>]*>\s*Şirketin Dahil Olduğu Endeksler\s*<\/h3>([\s\S]*?)(?=<h3\b)/);
 if (!section) throw new Error('KAP endeks bölümü bulunamadı.');
 const labels=[...section[1].matchAll(/<a\b[^>]*href="\/tr\/Endeksler\?[^\"]+"[^>]*>([\s\S]*?)<\/a>/g)].map(m=>normalizeIdentity(htmlText(m[1])));
 if(!labels.length) throw new Error('KAP endeks bölümü okunamadı.');
 const indices=[['XKTUM','BIST Katılım Tüm'],['XKT100','BIST Katılım 100'],['XKT50','BIST Katılım 50'],['XKT30','BIST Katılım 30']].map(([indexCode,indexName])=>({indexCode,indexName,isMember:labels.includes(normalizeIdentity(indexName)),description:'KAP şirket sayfasında gösterilen üyelik; dönem listesi ayrıca kontrol edilmelidir.'}));
 const included=indices[0].isMember;
 const result=unverifiedEvaluation(instrument);
 return {...result,status:ComplianceStatus.UNCERTAIN,statusLabel:included?'KAP: Katılım endeksinde yer alıyor':'KAP: Katılım Tüm üyeliği gösterilmiyor',summaryReason:'KAP şirket sayfasındaki endeks bilgisi okundu. Güncel KAFİF oranları ve BIST dönem listesi ayrıca doğrulanmalıdır; tam uygunluk hükmü verilmez.',confidence:ConfidenceLevel.MEDIUM,asOf:checkedAt,indices,sources:[{sourceName:SourceName.KAP,tier:SourceTier.OFFICIAL_PRIMARY,url:sourceLinks(instrument).kap,title:'KAP şirket sayfası — endeks üyeliği',badgeText:included?'Katılım Tüm üyeliği gösteriliyor':'Katılım Tüm üyeliği gösterilmiyor',fetchedAt:checkedAt,notes:'Finansal oranlar bu sayfadan alınmadı.'}]};
}

export async function fetchKapText(url: string): Promise<string> {
 const controller=new AbortController(); const timeout=setTimeout(()=>controller.abort(),12000);
 try {const res=await fetch(url,{signal:controller.signal,credentials:'omit',cache:'no-store'}); if(!res.ok) throw new Error(`KAP HTTP ${res.status}`); if(!res.url.startsWith('https://www.kap.org.tr/')) throw new Error('KAP yönlendirmesi doğrulanamadı.'); return await res.text();} finally {clearTimeout(timeout);}
}

export async function checkLiveInstrument(instrument: InstrumentSummary): Promise<ComplianceEvaluation> {
 if(instrument.type!==InstrumentType.STOCK || !instrument.kapUrl) return unverifiedEvaluation(instrument);
 try {const html=await fetchKapText(sourceLinks(instrument).kap); return parseKapMembership(html,instrument,new Date().toISOString());} catch {return unverifiedEvaluation(instrument);}
}
