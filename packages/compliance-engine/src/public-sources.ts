import { ComplianceEvaluation, ComplianceStatus, ConfidenceLevel, CriterionCheck, InstrumentSummary, InstrumentType, SourceName, SourceTier } from '@katilim/shared-types';
import { htmlText, normalizeIdentity, unverifiedEvaluation, parseKapFund, sourceLinks } from './live-data.js';

export const BIST_MEMBERSHIP_URL = 'https://borsaistanbul.com/datum/hisse_endeks_katilim_ds.csv';
export const KAFIF_URL = 'https://www.kap.org.tr/tr/kfifAllInfoListByItem/KPY97SummaryGrid';
const TEFAS_API = 'https://www.tefas.gov.tr/api/funds/';
const indices = [['XKTUM','BIST Katılım Tüm'],['XK100','BIST Katılım 100'],['XK050','BIST Katılım 50'],['XK030','BIST Katılım 30'],['XK030EA','BIST Katılım 30 Eşit Ağırlıklı'],['XSRDK','BIST Katılım Sürdürülebilirlik'],['XKTMT','BIST Katılım Temettü']];
const DAY = 86400000;
function isoDate(value: string): string {
 const m=value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/); const date=m?`${m[3]}-${m[2]}-${m[1]}`:value;
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0,10)!==date) throw Error('Kaynak tarihi okunamadı.');
 return date;
}
function turkeyDate(now: string) {return new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Istanbul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(now));}
function currentDate(date: string, now: string, days: number, scheduled=false) {
 const age=Date.parse(turkeyDate(now))-Date.parse(date);
 if(scheduled&&age===-DAY) return true;
 if(!Number.isFinite(age)||age<0||age>days*DAY) throw Error('Kaynak tarihi güncel değil.');
 return false;
}
export function parseBistMembership(csv: string, instrument: InstrumentSummary, now: string) {
 const lines=csv.replace(/^\uFEFF/,'').trim().split(/\r?\n/);
 if(!lines[0]?.includes('ENDEKS KODU')||!lines[1]?.includes('INDEX CODE')) throw Error('BIST CSV şeması değişti.');
 const rows=lines.slice(2).map(line=>line.split(';'));
 if(rows.length<100||rows.some(r=>r.length!==6||!/^\w+\.E$/.test(r[0])||!indices.some(i=>i[0]===r[2]))) throw Error('BIST listesi eksik veya değişmiş.');
 const dates=new Set(rows.map(r=>isoDate(r[5])));
 if(dates.size!==1||indices.some(([code])=>!rows.some(r=>r[2]===code))) throw Error('BIST endeks kapsamı doğrulanamadı.');
 const date=[...dates][0]; const upcoming=currentDate(date,now,7,true);
 return { date, upcoming, indices:indices.map(([indexCode,indexName])=>({indexCode,indexName,isMember:rows.some(r=>r[0]===`${instrument.symbol}.E`&&r[2]===indexCode),period:date,description:upcoming?'İleri tarihli BIST listesi; bugünkü üyelik olarak yorumlanmaz.':'Borsa İstanbul resmi bileşen listesi.'})) };
}

export function parseKafif(html: string, instrument: InstrumentSummary, now: string): { period: string; criteria: CriterionCheck[]; warnings: string[] } {
 const markup=html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'');
 const heads=[...markup.matchAll(/<th\b[^>]*>([\s\S]*?)<\/th>/gi)].map(m=>htmlText(m[1]));
 if(heads.length!==12||!heads[9].includes('Gelirlerinin Oranı')||!heads[10].includes('Varlıklarının Oranı')||!heads[11].includes('Borçlarının Oranı')) throw Error('KAFİF tablo şeması değişti.');
 const rows=[...markup.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map(m=>[...m[1].matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map(m=>htmlText(m[1]))).filter(r=>r[0]===instrument.symbol);
 if(rows.length!==1||rows[0].length!==12||normalizeIdentity(rows[0][1])!==normalizeIdentity(instrument.name)) throw Error('KAFİF şirket kimliği doğrulanamadı.');
 const row=rows[0]; const period=row[3]; const pm=period.match(/^(\d{4}) \/ (3|6|9|12) Aylık$/);
 if(!pm) throw Error('KAFİF finansal dönemi okunamadı.');
 const periodEnd=new Date(Date.UTC(Number(pm[1]),Number(pm[2]),0)).toISOString().slice(0,10);
 const warnings: string[]=[];
 if(Date.parse(periodEnd)>Date.parse(now)) throw Error('KAFİF dönemi gelecekte.');
 if(Date.parse(now)-Date.parse(periodEnd)>370*DAY) warnings.push('KAFİF dönemi bir yıldan eski; güncel uygunluk değerlendirmesi yapılamaz.');
 const names=['Uygun olmayan faaliyet alanı beyanı','Uygun olmayan imtiyaz beyanı','Standart 1.5 / Rehber 1.D beyanı','Doğrudan aykırı faaliyet / gelir beyanı','Uygun olmayan gelir oranı','Uygun olmayan varlık oranı','Uygun olmayan borç oranı'];
 const criteria=names.map((name,i):CriterionCheck=>{
  const raw=row[i+5]; const base={id:`kafif-${i+1}`,name,category:i<4?'ACTIVITY' as const:'FINANCIAL_RATIO' as const,description:heads[i+5],isPassed:null,statusText:'Şirket beyanı',note:`KAP KAFİF · ${period}. BIST üyeliğinden ayrı gösterilir; otomatik fetva verilmez.`};
  if(i<4) return {...base,actualValue:/^(EVET|HAYIR)$/.test(raw)?raw:undefined,actualFormatted:/^(EVET|HAYIR)$/.test(raw)?raw:'Doğrulanamadı',unit:'TEXT'};
  const value=/^\d+(?:,\d+)?$/.test(raw)?Number(raw.replace(',','.')):NaN;
  return {...base,actualValue:Number.isFinite(value)?value:undefined,actualFormatted:Number.isFinite(value)?`%${value.toLocaleString('tr-TR',{maximumFractionDigits:4})}`:'Doğrulanamadı',unit:'%'};
 });
 if(criteria.some(c=>c.actualValue===undefined)) warnings.push('Bazı KAFİF alanları eksik; boş değerler sıfır sayılmaz.');
 return {period,criteria,warnings};
}

const labels: Record<string,string> = {hs:'Hisse senedi',kkstl:'Kamu kira sertifikaları (TL)',btas:'BIST taahhütlü işlem pazarı satım',yyf:'Fon katılma payları',dt:'Devlet tahvili',ost:'Özel sektör tahvili',r:'Repo',tr:'Ters repo',tpp:'Takasbank para piyasası',bpp:'Borsa İstanbul para piyasası',khtl:'Katılma hesabı (TL)',khd:'Katılma hesabı (döviz)',osks:'Özel sektör kira sertifikaları',yhs:'Yabancı hisse senedi',byf:'Borsa yatırım fonu katılma payları',ybyf:'Yabancı borsa yatırım fonu',vmtl:'Mevduat (TL)',vmd:'Mevduat (döviz)',d:'Diğer',km:'Kıymetli madenler',hb:'Hazine bonosu',fb:'Finansman bonosu',vdm:'Varlığa dayalı menkul kıymetler',kba:'Kamu dış borçlanma araçları',osdb:'Özel sektör dış borçlanma araçları',kibd:'Döviz cinsi kamu iç borçlanma araçları',oksyd:'Özel sektör yurt dışı kira sertifikaları',kmkba:'Kıymetli maden cinsi kamu borçlanma araçları',kmkks:'Kıymetli maden cinsi kamu kira sertifikaları',ybosb:'Yabancı özel sektör borçlanma araçları',ybkb:'Yabancı kamu borçlanma araçları',gykb:'Gayrimenkul yatırım fonu katılma payları',gsykb:'Girişim sermayesi yatırım fonu katılma payları',vint:'Vadeli işlemler nakit teminatları'};
function resultRows(data: any): any[] {
 if(!data||data.errorCode||data.errorMessage||!Array.isArray(data.resultList)) throw Error('TEFAS yanıtı doğrulanamadı.');
 return data.resultList;
}
export function parseTefasProfile(data: any, instrument: InstrumentSummary) {
 const rows=resultRows(data);
 if(rows.length!==1||rows[0].fonKodu!==instrument.symbol||normalizeIdentity(rows[0].fonUnvan||'')!==normalizeIdentity(instrument.name)) throw Error('TEFAS fon kimliği eşleşmedi.');
 const r=rows[0]; return {tradingStatus:typeof r.tefasDurum==='string'?r.tefasDurum:undefined,isin:typeof r.isinKodu==='string'?r.isinKodu:undefined,interestContent:r.faizIcerigi==null?undefined:String(r.faizIcerigi)};
}
export function parseTefasAllocation(data: any, instrument: InstrumentSummary, now: string) {
 const rows=resultRows(data);
 if(!rows.length||rows.some(r=>r.fonKodu!==instrument.symbol||normalizeIdentity(r.fonUnvan||'')!==normalizeIdentity(instrument.name))) throw Error('TEFAS dağılım kimliği eşleşmedi.');
 const dated=rows.map(r=>({r,date:isoDate(r.tarih)})).sort((a,b)=>b.date.localeCompare(a.date));
 const {r,date}=dated[0]; currentDate(date,now,14);
 const allocation=Object.entries(r).filter(([code])=>!['fonKodu','fonUnvan','tarih','bilFiyat'].includes(code)).flatMap(([code,value])=>{
  if(value===null||value===undefined) return [];
  if(typeof value!=='number'||!Number.isFinite(value)||value<0||value>100) throw Error('TEFAS dağılım oranı geçersiz.');
  return [{code,name:labels[code]||`TEFAS varlık kodu: ${code}`,percent:value}];
 }).sort((a,b)=>b.percent-a.percent);
 if(!allocation.length||allocation.reduce((s,r)=>s+r.percent,0)>100.5) throw Error('TEFAS dağılım toplamı geçersiz.');
 return {allocationDate:date,allocation};
}

// Requests have no account, key, cookies or browsing context. Only fixed official URLs are accepted.
export async function fetchPublic(url: string, payload?: unknown): Promise<string> {
 const allowed=url===BIST_MEMBERSHIP_URL||url===KAFIF_URL||/^https:\/\/www\.kap\.org\.tr\/tr\/fon-bilgileri\/ozet\/[a-z0-9-]+$/.test(url)||['fonProfilBilgiGetir','dagilimSiraliGetirT'].some(e=>url===TEFAS_API+e);
 if(!allowed) throw Error('İzin verilmeyen kaynak URL.');
 const controller=new AbortController(); const timeout=setTimeout(()=>controller.abort(),15000);
 try {
  const response=await fetch(url,{method:payload?'POST':'GET',headers:payload?{'Content-Type':'application/json','Accept':'application/json'}:undefined,body:payload?JSON.stringify(payload):undefined,credentials:'omit',referrerPolicy:'no-referrer',redirect:'error',cache:'no-store',signal:controller.signal});
  if(!response.ok) throw Error(`Kaynak HTTP ${response.status}`);
  const body=await response.text(); if(body.length>5_000_000) throw Error('Kaynak yanıtı çok büyük.'); return body;
 } finally {clearTimeout(timeout);}
}
const shared = new Map<string,{time:number;body:string}>();
const pending = new Map<string,Promise<string>>();
async function sharedText(url: string, force: boolean) {
 const cached=shared.get(url); if(!force&&cached&&Date.now()-cached.time<3600000) return cached.body;
 if(pending.has(url)) return pending.get(url)!;
 const request=fetchPublic(url).then(body=>{shared.set(url,{time:Date.now(),body});return body;}); pending.set(url,request);
 try {return await request;} finally {pending.delete(url);}
}
export async function checkPublicInstrument(instrument: InstrumentSummary, force=false): Promise<ComplianceEvaluation> {
 const now=new Date().toISOString(); let result=unverifiedEvaluation(instrument); const warnings:string[]=[];
 const provenance=(sourceName:SourceName,url:string,title:string,fields={})=>({sourceName,tier:SourceTier.OFFICIAL_PRIMARY,url,title,badgeText:'Resmi kaynak okundu',fetchedAt:shared.has(url)?new Date(shared.get(url)!.time).toISOString():now,...fields});
 if(instrument.type===InstrumentType.STOCK) {
  const results=await Promise.allSettled([sharedText(BIST_MEMBERSHIP_URL,force).then(csv=>parseBistMembership(csv,instrument,now)),sharedText(KAFIF_URL,force).then(html=>parseKafif(html,instrument,now))]);
  if(results[0].status==='fulfilled') {const data=results[0].value; result.indices=data.indices; result.sources.push(provenance(SourceName.BIST,BIST_MEMBERSHIP_URL,'BIST resmi katılım endeks bileşenleri',{publishedAt:data.date}));if(data.upcoming) warnings.push(`BIST dosyası ileri tarihli: ${data.date}. Bu liste bugünkü üyelik olarak yorumlanmaz.`);}
  else warnings.push('Güncel BIST bileşen listesi doğrulanamadı.');
  if(results[1].status==='fulfilled') {const data=results[1].value; result.criteria=data.criteria; result.financialPeriod=data.period;warnings.push(...data.warnings);result.sources.push(provenance(SourceName.KAP,KAFIF_URL,'KAP KAFİF şirket beyanları',{financialPeriod:data.period}));}
  else warnings.push('Bu şirket için KAFİF verisi doğrulanamadı.');
  result.statusLabel=result.indices.length?(result.indices[0].isMember?'BIST: Katılım Tüm üyesi':'BIST: Katılım Tüm listesinde yok'):result.criteria.length?'KAFİF beyanları okundu':'Güncel veri doğrulanamadı';
  if(results[0].status==='fulfilled'&&results[0].value.upcoming) result.statusLabel=`BIST ileri tarihli liste: ${results[0].value.date}`;
  result.summaryReason='Resmi endeks üyeliği ve şirketin finansal dönem beyanları ayrı gösterilir. KAFİF oranlarından otomatik dini hüküm veya endeks üyeliği üretilmez.';
 } else if(instrument.kapUrl&&instrument.type!==InstrumentType.UNKNOWN) {
  const fundType=instrument.type===InstrumentType.PENSION_FUND?'EMK':instrument.type===InstrumentType.ETF?'BYF':'YAT';
  const from=turkeyDate(new Date(Date.now()-27*DAY).toISOString()).replace(/-/g,'');const to=turkeyDate(now).replace(/-/g,'');
  const payload={fonTipi:fundType,fonKodu:instrument.symbol,fonKod:instrument.symbol,aramaMetni:null,fonTurKod:null,fonGrubu:null,sfonTurKod:null,basTarih:from,bitTarih:to,basSira:1,bitSira:500,fonTurAciklama:null,dil:'TR',kurucuKod:null,sFonTurKod:'',fonGrup:'',fonUnvanTip:''};
  const results=await Promise.allSettled([fetchPublic(sourceLinks(instrument).kap).then(html=>parseKapFund(html,instrument,now)),fetchPublic(TEFAS_API+'fonProfilBilgiGetir',{fonKodu:instrument.symbol,dil:'TR'}).then(body=>parseTefasProfile(JSON.parse(body),instrument)),fetchPublic(TEFAS_API+'dagilimSiraliGetirT',payload).then(body=>parseTefasAllocation(JSON.parse(body),instrument,now))]);
  result.fundData={allocation:[]};
  if(results[0].status==='fulfilled') result= {...result,...results[0].value,fundData:result.fundData}; else warnings.push('KAP fon kaydı doğrulanamadı.');
  if(results[1].status==='fulfilled') {Object.assign(result.fundData!,results[1].value);result.sources.push(provenance(SourceName.TEFAS,sourceLinks(instrument).tefas,'TEFAS fon profili'));} else warnings.push('TEFAS fon profili doğrulanamadı; her KAP fonu TEFAS kapsamında olmayabilir.');
  if(results[2].status==='fulfilled') {Object.assign(result.fundData!,results[2].value);result.sources.push(provenance(SourceName.TEFAS,sourceLinks(instrument).tefas,'TEFAS varlık türü dağılımı',{publishedAt:results[2].value.allocationDate}));} else warnings.push('Güncel TEFAS portföy dağılımı doğrulanamadı.');
  if(!result.fundData!.interestContent) warnings.push('Faiz içeriği alanı doğrulanamadı; boş değer faizsiz anlamına gelmez.');
  if(result.fundData!.allocation.length&&result.fundData!.allocation.reduce((s,a)=>s+a.percent,0)<99.5) warnings.push('Bildirilen dağılım toplamı %100 altında; eksik alanlar sıfır olarak tamamlanmaz.');
  warnings.push('Varlık dağılımı tek tek menkul kıymetleri göstermez. İcazet belgesi ayrıca incelenmelidir.');
  result.summaryReason='KAP şemsiye türü ve mevcut TEFAS verileri ayrı gösterilir. Portföy bileşenleri ve icazet incelenmeden tam uygunluk hükmü verilmez.';
  if(!result.fundProfile&&result.sources.length) result.statusLabel='TEFAS fon verileri okundu';
 }
 result.dataWarnings=warnings;
 if(result.sources.length) {result.asOf=now;result.status=ComplianceStatus.UNCERTAIN;result.confidence=ConfidenceLevel.MEDIUM;result.ruleSetAuthority='Resmi kaynak beyanları';result.ruleSetVersion='Kaynak kontrolü 1.3';}
 return result;
}
