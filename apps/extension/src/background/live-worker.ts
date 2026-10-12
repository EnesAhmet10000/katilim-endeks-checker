import { BrowserRuntime } from '../adapters/browser-runtime.js';
import { ComplianceCheckResponse, InstrumentType } from '@katilim/shared-types';
import { COMPANY_DIRECTORY, CompanyIdentity, KAP_DIRECTORY_URL, parseCompanyDirectory, fetchKapText, resolveCompany, checkLiveInstrument } from '@katilim/compliance-engine';
import { LocalComplianceEvaluator } from './local-evaluator.js';

const localEvaluator = new LocalComplianceEvaluator();
const HOUR = 60 * 60 * 1000;
let directoryRequest: Promise<CompanyIdentity[]> | undefined;
async function loadDirectory(force: boolean): Promise<CompanyIdentity[]> {
 const cached = await BrowserRuntime.getStorage('kap-directory-v1');
 if (!force && cached?.entries?.length && Date.now()-cached.checkedAt < 24*HOUR) return cached.entries;
 if (directoryRequest) return directoryRequest;
 directoryRequest=(async()=>{
  try {const entries=parseCompanyDirectory(await fetchKapText(KAP_DIRECTORY_URL)); await BrowserRuntime.setStorage('kap-directory-v1',{entries,checkedAt:Date.now()}); return entries;}
  catch {return cached?.entries || COMPANY_DIRECTORY;}
 })();
 try {return await directoryRequest;} finally {directoryRequest=undefined;}
}

async function check(query: string, force=false): Promise<ComplianceCheckResponse> {
 const start=performance.now();
 const directory=await loadDirectory(force);
 const official=resolveCompany(localEvaluator.sanitizeQuery(query),directory);
 const response=localEvaluator.evaluateDirect(query);
 if(official) response.resolution={isResolved:true,isAmbiguous:false,instrument:official,originalQuery:query,normalizedQuery:official.symbol};
 let instrument=response.resolution.instrument;
 if(!instrument) return response;
 const current=directory.find(r=>r.symbol===instrument!.symbol);
 if(current) instrument={...instrument,name:current.name,kapUrl:current.kapUrl,type:InstrumentType.STOCK};
 response.resolution.instrument=instrument;
 const key=`kap-membership-v1-${instrument.symbol}`;
 const cached=await BrowserRuntime.getStorage(key);
 if(!force && cached?.asOf && cached.instrument?.kapUrl===instrument.kapUrl && Date.now()-Date.parse(cached.asOf)<HOUR) response.evaluation={...cached,isCached:true,cachedAt:cached.asOf};
 else {
  response.evaluation=await checkLiveInstrument(instrument);
  if(response.evaluation.asOf) await BrowserRuntime.setStorage(key,response.evaluation);
 }
 response.executionTimeMs=Math.round(performance.now()-start);
 return response;
}

chrome.runtime.onInstalled.addListener(()=>{
 chrome.contextMenus.removeAll(()=>chrome.contextMenus.create({id:'checkKatilimCompliance',title:'Katılım Uygunluğunu Kontrol Et',contexts:['selection']}));
});
chrome.contextMenus.onClicked.addListener((info,tab)=>{
 if(info.menuItemId==='checkKatilimCompliance' && tab?.id && info.selectionText) void executeComplianceCheck(tab.id,info.selectionText);
});
chrome.runtime.onMessage.addListener((message,sender,sendResponse)=>{
 if(message.type==='PERFORM_CHECK' && sender.tab?.id) {executeComplianceCheck(sender.tab.id,message.query,!!message.forceRefresh).then(sendResponse); return true;}
 if(message.type==='POPUP_DIRECT_CHECK') {check(message.query,!!message.forceRefresh).then(sendResponse).catch(()=>sendResponse({success:false,error:'Kaynak bağlantısı kurulamadı.'}));return true;}
 if(message.type==='POPUP_SEARCH') {loadDirectory(false).then(directory=>{
  const q=localEvaluator.normalizeTurkish(message.query);
  const results=directory.filter(r=>localEvaluator.normalizeTurkish(r.symbol+' '+r.name).includes(q)).slice(0,8).map(r=>resolveCompany(r.symbol,directory));
  sendResponse({query:message.query,results:results.length?results:localEvaluator.search(message.query)});
 });return true;}
});

async function executeComplianceCheck(tabId: number, query: string, force=false) {
 try {
  await chrome.scripting.executeScript({target:{tabId},files:['content.js']});
  await BrowserRuntime.sendMessageToTab(tabId,{type:'SHOW_LOADING',query});
  const data=await check(query,force);
  if(data.resolution.isAmbiguous) await BrowserRuntime.sendMessageToTab(tabId,{type:'SHOW_CANDIDATES',query,candidates:data.resolution.candidates});
  else if(data.evaluation) await BrowserRuntime.sendMessageToTab(tabId,{type:'SHOW_RESULT',query,evaluation:data.evaluation});
  else await BrowserRuntime.sendMessageToTab(tabId,{type:'SHOW_ERROR',query,error:'Şirket veya fon bulunamadı. Resmi hisse kodunu seçin.'});
  return data;
 } catch {await BrowserRuntime.sendMessageToTab(tabId,{type:'SHOW_ERROR',query,error:'Bu sayfada kontrol açılamadı. Eklenti menüsünden arama yapabilirsiniz.'});}
}
