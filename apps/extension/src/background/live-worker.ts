import { BrowserRuntime } from '../adapters/browser-runtime.js';
import { ComplianceCheckResponse } from '@katilim/shared-types';
import { COMPANY_DIRECTORY, CompanyIdentity, KAP_DIRECTORY_URL, parseCompanyDirectory, fetchKapText } from '@katilim/compliance-engine';
import { LocalComplianceEvaluator } from './local-evaluator.js';
import { FUND_DIRECTORY, FundIdentity, KAP_FUNDS_DIRECTORY_URL, parseFundDirectory, resolveInstrument, searchInstruments } from '@katilim/compliance-engine';
import { checkPublicInstrument } from '@katilim/compliance-engine';
import {LANGUAGE_KEY,normalizeLanguage,translate} from '../i18n.js';

const localEvaluator = new LocalComplianceEvaluator();
const HOUR = 60 * 60 * 1000;
let directoryRequest: Promise<CompanyIdentity[]> | undefined;
let fundsRequest: Promise<FundIdentity[]> | undefined;
async function loadFunds(force: boolean): Promise<FundIdentity[]> {
 const cached=await BrowserRuntime.getStorage('kap-funds-directory-v1');
 if(!force && cached?.entries?.length && Date.now()-cached.checkedAt<24*HOUR) return cached.entries;
 if(fundsRequest) return fundsRequest;
 fundsRequest=(async()=>{
  try {const entries=parseFundDirectory(await fetchKapText(KAP_FUNDS_DIRECTORY_URL));await BrowserRuntime.setStorage('kap-funds-directory-v1',{entries,checkedAt:Date.now()});return entries;}
  catch {return cached?.entries||FUND_DIRECTORY;}
 })();
 try {return await fundsRequest;} finally {fundsRequest=undefined;}
}
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
 if(typeof query!=='string'||!query.trim()||query.length>256) return {success:false,error:'En fazla 256 karakterlik bir hisse veya fon adı seçin.',resolution:{isResolved:false,isAmbiguous:false,originalQuery:'',normalizedQuery:''},executionTimeMs:0};
 const start=performance.now();
 const [directory,funds]=await Promise.all([loadDirectory(force),loadFunds(force)]);
 const official=resolveInstrument(query,localEvaluator.sanitizeQuery(query),directory,funds);
 const response=localEvaluator.evaluateDirect(query);
 if(official.isResolved || official.isAmbiguous) response.resolution=official;
 if(response.resolution.isAmbiguous) {delete response.evaluation;return response;}
 let instrument=response.resolution.instrument;
 if(!instrument) return response;
 response.resolution.instrument=instrument;
 const key=`public-source-v3-${instrument.type}-${instrument.symbol}`;
 const cached=await BrowserRuntime.getStorage(key);
 if(!force && cached?.asOf && cached.instrument?.kapUrl===instrument.kapUrl && Date.now()-Date.parse(cached.asOf)<HOUR) response.evaluation={...cached,isCached:true,cachedAt:cached.asOf};
 else {
  response.evaluation=await checkPublicInstrument(instrument,force);
  if(response.evaluation.asOf) await BrowserRuntime.setStorage(key,response.evaluation);
 }
 response.executionTimeMs=Math.round(performance.now()-start);
 return response;
}

async function contextMenuTitle(){return translate('Katılım Uygunluğunu Kontrol Et',normalizeLanguage(await BrowserRuntime.getStorage(LANGUAGE_KEY)));}
chrome.runtime.onInstalled.addListener(()=>{
 void contextMenuTitle().then(title=>chrome.contextMenus.removeAll(()=>chrome.contextMenus.create({id:'checkKatilimCompliance',title,contexts:['selection']})));
});
chrome.storage.onChanged?.addListener((changes,area)=>{
 if(area==='local'&&changes[LANGUAGE_KEY]) chrome.contextMenus.update('checkKatilimCompliance',{title:translate('Katılım Uygunluğunu Kontrol Et',normalizeLanguage(changes[LANGUAGE_KEY].newValue))},()=>{void chrome.runtime.lastError;});
});
chrome.contextMenus.onClicked.addListener((info,tab)=>{
 if(info.menuItemId==='checkKatilimCompliance' && tab?.id && info.selectionText) void executeComplianceCheck(tab.id,info.selectionText);
});
chrome.runtime.onMessage.addListener((message,sender,sendResponse)=>{
 if(message.type==='PERFORM_CHECK' && sender.tab?.id) {executeComplianceCheck(sender.tab.id,message.query,!!message.forceRefresh).then(sendResponse); return true;}
 if(message.type==='POPUP_DIRECT_CHECK') {check(message.query,!!message.forceRefresh).then(sendResponse).catch(()=>sendResponse({success:false,error:'Kaynak bağlantısı kurulamadı.'}));return true;}
 if(message.type==='POPUP_SEARCH') {Promise.all([loadDirectory(false),loadFunds(false)]).then(([directory,funds])=>{
  const results=searchInstruments(message.query,directory,funds);
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
