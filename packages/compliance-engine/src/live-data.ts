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
 const stock=instrument.type===InstrumentType.STOCK;
 const allowed=stock ? /^https:\/\/www\.kap\.org\.tr\/tr\/sirket-bilgileri\/ozet\/\d+-[a-z0-9-]+$/ : /^https:\/\/www\.kap\.org\.tr\/tr\/fon-bilgileri\/ozet\/[a-z0-9-]+$/;
 const kap=instrument.kapUrl && allowed.test(instrument.kapUrl) ? instrument.kapUrl : stock?KAP_DIRECTORY_URL:'https://www.kap.org.tr/tr/YatirimFonlari/ALL';
 return {kap, tefas:`https://www.tefas.gov.tr/FonAnaliz.aspx?FonKod=${encodeURIComponent(symbol)}`,helalFinans:`https://helalfinans.net/hisseler/${encodeURIComponent(symbol)}`,fintables:`https://fintables.com/sirketler/${encodeURIComponent(symbol)}`};
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
 if(!url.startsWith('https://www.kap.org.tr/tr/')) throw new Error('İzin verilmeyen KAP adresi.');
 const controller=new AbortController(); const timeout=setTimeout(()=>controller.abort(),12000);
 try {const res=await fetch(url,{signal:controller.signal,credentials:'omit',referrerPolicy:'no-referrer',redirect:'error',cache:'no-store'}); if(!res.ok) throw new Error(`KAP HTTP ${res.status}`); if(!res.url.startsWith('https://www.kap.org.tr/')) throw new Error('KAP yönlendirmesi doğrulanamadı.'); return await res.text();} finally {clearTimeout(timeout);}
}

export async function checkLiveInstrument(instrument: InstrumentSummary): Promise<ComplianceEvaluation> {
 if(!instrument.kapUrl || instrument.type===InstrumentType.UNKNOWN) return unverifiedEvaluation(instrument);
 try {const html=await fetchKapText(sourceLinks(instrument).kap); const checkedAt=new Date().toISOString(); return instrument.type===InstrumentType.STOCK?parseKapMembership(html,instrument,checkedAt):parseKapFund(html,instrument,checkedAt);} catch {return unverifiedEvaluation(instrument);}
}

export function parseKapFund(html: string, instrument: InstrumentSummary, checkedAt: string): ComplianceEvaluation {
 const markup=html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'');
 const text=htmlText(markup);
 if(!new RegExp(`(?:^|\\s)${instrument.symbol}(?:\\s|$)`).test(text) || !normalizeIdentity(text).includes(normalizeIdentity(instrument.name))) throw new Error('KAP fon kimliği eşleşmedi.');
 const fields=new Map<string,string>();
 for(const m of markup.matchAll(/<h3\b[^>]*>([\s\S]*?)<\/h3>([\s\S]*?)(?=<h3\b|$)/g)) {
  const value=m[2].match(/<p\b[^>]*>([\s\S]*?)<\/p>/);
  if(value) fields.set(normalizeIdentity(htmlText(m[1])),htmlText(value[1]));
 }
 const umbrellaName=fields.get(normalizeIdentity('Fonun Bağlı Olduğu Şemsiye Fonun Ünvanı'));
 const umbrellaType=fields.get(normalizeIdentity('Fonun Bağlı Olduğu Şemsiye Fonun Türü'));
 // A fund name is never substituted for a missing official umbrella field.
 const participation=umbrellaType ? normalizeIdentity(umbrellaType)==='KATILIMSEMSIYEFONU' : null;
 const result=unverifiedEvaluation(instrument);
 return {...result,status:ComplianceStatus.UNCERTAIN,statusLabel:participation===true?'KAP: Katılım şemsiye fonu':umbrellaType?'KAP: Fon kaydı doğrulandı':'KAP: Fon kimliği doğrulandı',summaryReason:umbrellaType?`Resmi şemsiye fon türü: ${umbrellaType}. Güncel portföy dağılımı ve icazet belgesi ayrıca doğrulanmalıdır; tam uygunluk hükmü verilmez.`:'KAP fon kimliği okundu; şemsiye türü bu sayfada doğrulanamadı. Portföy ve icazet bilgileri ayrıca incelenmelidir.',confidence:ConfidenceLevel.MEDIUM,asOf:checkedAt,fundProfile:{umbrellaName,umbrellaType,reportedParticipation:participation},sources:[{sourceName:SourceName.KAP,tier:SourceTier.OFFICIAL_PRIMARY,url:sourceLinks(instrument).kap,title:'KAP resmi fon kaydı',badgeText:umbrellaType||'Fon kimliği okundu',fetchedAt:checkedAt,notes:'Fon portföyü, yatırım stratejisi ve icazet bu kontrolde doğrulanmadı.'}]};
}
