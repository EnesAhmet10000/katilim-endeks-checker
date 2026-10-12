import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const read=name=>readFileSync(name,'utf8');
const bodies={directory:read('kap-directory-fixture.html'),funds:read('kap-funds-directory-fixture.html'),fund:read('kap-fund-kua-fixture.html'),bist:read('bist-membership-fixture.csv'),kafif:read('kap-kafif-fixture.html'),profile:read('tefas-profile-fixture.json'),allocation:read('tefas-allocation-fixture.json')};
const storage={};let listener;const requests=[];let offline=false;let blockBist=false;
const chrome={runtime:{onInstalled:{addListener(){}},onMessage:{addListener(fn){listener=fn;}}},contextMenus:{onClicked:{addListener(){}}},storage:{local:{get(keys,cb){cb(Object.fromEntries(keys.map(k=>[k,storage[k]])));},set(obj,cb){Object.assign(storage,obj);cb();}}}};
class TestDate extends Date {constructor(...args){super(...(args.length?args:['2026-10-12T12:00:00Z']));}static now(){return Date.parse('2026-10-12T12:00:00Z');}}
const context=vm.createContext({chrome,console,URL,performance,setTimeout,clearTimeout,AbortController,Date:TestDate,fetch:async(url,options)=>{
 requests.push({url,options});if(offline||blockBist&&url.includes('.csv')) throw Error('offline');
 const body=url.includes('bist-sirketler')?bodies.directory:url.includes('YatirimFonlari/ALL')?bodies.funds:url.includes('.csv')?bodies.bist:url.includes('KPY97')?bodies.kafif:url.includes('fonProfil')?bodies.profile:url.includes('dagilim')?bodies.allocation:bodies.fund;
 return {ok:true,url,text:async()=>body};
}});
vm.runInContext(read('apps/extension/dist/chrome/background.js'),context);
const send=message=>new Promise(resolve=>listener(message,{},resolve));
let result=await send({type:'POPUP_DIRECT_CHECK',query:'Petkim'});
assert.equal(result.evaluation.instrument.symbol,'PETKM');assert.equal(result.evaluation.status,'UNCERTAIN');assert.equal(result.evaluation.indices[0].isMember,true);assert.equal(result.evaluation.criteria[6].actualValue,24.19);assert.equal(requests.length,4);
const timestamp=result.evaluation.asOf;
result=await send({type:'POPUP_DIRECT_CHECK',query:'BIST:PETKM'});
assert.equal(result.evaluation.isCached,true);assert.equal(result.evaluation.asOf,timestamp);assert.equal(requests.length,4);
result=await send({type:'POPUP_DIRECT_CHECK',query:'PETKİM',forceRefresh:true});assert.equal(requests.length,8);assert.equal(result.evaluation.isCached,false);
offline=true;
result=await send({type:'POPUP_DIRECT_CHECK',query:'PETKM',forceRefresh:true});assert.equal(result.evaluation.status,'INSUFFICIENT_DATA');assert.equal(result.evaluation.indices.length,0);assert.equal(result.evaluation.asOf,'');
storage['public-source-v3-STOCK-PETKM'].asOf='2020-01-01T00:00:00Z';
result=await send({type:'POPUP_DIRECT_CHECK',query:'PETKM',forceRefresh:true});assert.equal(result.evaluation.status,'INSUFFICIENT_DATA');
assert.equal((await send({type:'POPUP_SEARCH',query:'Petkim'})).results[0].symbol,'PETKM');
offline=false;blockBist=true;
result=await send({type:'POPUP_DIRECT_CHECK',query:'PETKM',forceRefresh:true});assert.equal(result.evaluation.indices.length,0);assert.equal(result.evaluation.criteria.length,7);assert.ok(result.evaluation.dataWarnings.length);
blockBist=false;
result=await send({type:'POPUP_DIRECT_CHECK',query:'FON:KUA',forceRefresh:true});assert.equal(result.evaluation.instrument.type,'MUTUAL_FUND');assert.equal(result.evaluation.fundProfile.reportedParticipation,true);assert.equal(result.evaluation.status,'UNCERTAIN');assert.equal(result.evaluation.fundData.allocation.length,4);assert.equal(result.evaluation.sources.length,3);
assert.equal((await send({type:'POPUP_SEARCH',query:'KUA'})).results[0].type,'MUTUAL_FUND');
for(const {url,options} of requests){assert.ok(/^https:\/\/(?:www\.kap\.org\.tr|borsaistanbul\.com|www\.tefas\.gov\.tr)\//.test(url));assert.equal(options.credentials,'omit');assert.ok(!options.headers?.Authorization);assert.ok(!options.body?.includes('query'));}
const manifest=JSON.parse(read('apps/extension/dist/chrome/manifest.json'));assert.equal(manifest.version,'1.4.1');assert.equal(manifest.host_permissions.length,3);assert.ok(!manifest.permissions.includes('tabs'));assert.ok(!manifest.content_scripts);
console.log('PASS: actual bundled worker: public sources, fund allocation, missing source, aliases, directories, cache, forced refresh, offline; no keys/cookies/all-site permissions.');
