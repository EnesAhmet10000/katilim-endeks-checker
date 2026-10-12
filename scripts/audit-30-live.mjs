import {mkdirSync,writeFileSync,readFileSync,existsSync} from 'node:fs';
import {randomInt,createHash} from 'node:crypto';
import vm from 'node:vm';
import {parseCompanyDirectory,htmlText} from '../packages/compliance-engine/dist/index.js';
const date=new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Istanbul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const folder=`.research/audit-30-equities-${date}`;mkdirSync(folder,{recursive:true});
const captured=[];let count=0;
async function auditedFetch(url,options={}) {
 const startedAt=new Date().toISOString();
 const response=await fetch(url,{...options,signal:options.signal||AbortSignal.timeout(20000)});
 const body=await response.clone().text();
 const filename=`response-${String(++count).padStart(3,'0')}.txt`;writeFileSync(`${folder}/${filename}`,body);
 captured.push({url:String(url),status:response.status,finalUrl:response.url,startedAt,filename,sha256:createHash('sha256').update(body).digest('hex')});
 return response;
}
const directoryUrl='https://www.kap.org.tr/tr/bist-sirketler';
const directoryResponse=await auditedFetch(directoryUrl,{credentials:'omit',redirect:'error'});
if(!directoryResponse.ok) throw Error('Live directory unavailable');
const directory=parseCompanyDirectory(await directoryResponse.text());
const marketResponse=await auditedFetch('https://www.kap.org.tr/tr/Pazarlar',{credentials:'omit',redirect:'error'});
if(!marketResponse.ok) throw Error('Official equity markets unavailable');
const allowed=new Set(['YILDIZ PAZAR','ANA PAZAR','ALT PAZAR','YAKIN İZLEME PAZARI','PİYASA ÖNCESİ İŞLEM PLATFORMU','GİRİŞİM SERMAYESİ PAZARI']);
const eligible=new Map();let market='';
for(const match of (await marketResponse.text()).matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) {
 if(/colspan="4"/i.test(match[1])) market=htmlText(match[1]).replace(/\s+\d+ Şirket \/ Fon Bulundu.*$/,'').trim();
 else if(allowed.has(market)) {
  const cells=[...match[1].matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map(m=>htmlText(m[1]));
  for(const link of match[1].matchAll(/href="(\/tr\/sirket-bilgileri\/ozet\/[^"?#]+)"/g)) eligible.set('https://www.kap.org.tr'+link[1],cells[1]?.split(/\s+/)||[]);
 }
}
const pool=[...new Map(directory.filter(row=>eligible.get(row.kapUrl)?.includes(row.symbol)).map(row=>[row.kapUrl,row])).values()];
if(pool.length<400) throw Error('Equity universe unexpectedly incomplete: '+pool.length);
const universeCount=pool.length;
for(let i=pool.length-1;i>0;i--){const j=randomInt(i+1);[pool[i],pool[j]]=[pool[j],pool[i]];}
const previous=existsSync(`${folder}/sample.json`)?JSON.parse(readFileSync(`${folder}/sample.json`,'utf8')):null;
const sample=previous?previous.sample.map(row=>pool.find(candidate=>candidate.kapUrl===row.kapUrl)):pool.slice(0,30);
if(sample.some(row=>!row)) throw Error('Previous random company is not an eligible equity');
writeFileSync(`${folder}/sample.json`,JSON.stringify({pickedAt:previous?.pickedAt||new Date().toISOString(),method:'crypto.randomInt Fisher-Yates shuffle of official KAP equity markets; excludes bonds, funds and structured products; 30 distinct companies selected before results were read. Re-runs preserve companies and use their official equity symbol rather than other issuer codes.',universeCount,sample},null,2));
console.log('Random sample:',sample.map(row=>row.symbol).join(', '));
let listener;const storage={};
const chrome={runtime:{onInstalled:{addListener(){}},onMessage:{addListener(fn){listener=fn;}}},contextMenus:{onClicked:{addListener(){}}},storage:{local:{get(keys,callback){callback(Object.fromEntries(keys.map(key=>[key,storage[key]])))},set(values,callback){Object.assign(storage,values);callback();}}}};
const context=vm.createContext({chrome,console,URL,performance,setTimeout,clearTimeout,AbortController,fetch:auditedFetch});
const bundle=readFileSync('apps/extension/dist/chrome/background.js','utf8');vm.runInContext(bundle,context);
const results=[];
for(const row of sample) {
 const response=await new Promise(resolve=>listener({type:'POPUP_DIRECT_CHECK',query:`BIST:${row.symbol}`},{},resolve));
 let page;
 try {const request=await auditedFetch(row.kapUrl,{credentials:'omit',redirect:'error'});page={status:request.status,filename:captured.at(-1).filename};}catch(error){page={error:error.message};}
 results.push({identity:row,response,page});
 console.log(`${results.length}/30 ${row.symbol}: ${response.evaluation?.indices?.length||0} indices, ${response.evaluation?.criteria?.length||0} KAFIF fields, KAP page ${page.status||page.error}`);
 writeFileSync(`${folder}/run.json`,JSON.stringify({date,finishedAt:new Date().toISOString(),universeCount,workerSha256:createHash('sha256').update(bundle).digest('hex'),results,captured},null,2));
}
console.log('Saved',`${folder}/run.json`);
