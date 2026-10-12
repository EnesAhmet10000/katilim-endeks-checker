import {writeFileSync} from 'node:fs';
import {FUND_DIRECTORY,resolveInstrument,checkLiveInstrument} from '../packages/compliance-engine/dist/index.js';
const queries=['BIST:THYAO','BIST:AKBNK','BIST:BIMAS','BIST:SASA','BIST:MAVI','FON:KUA','FON:TTE','FON:'+FUND_DIRECTORY.find(r=>r.type==='PENSION_FUND').symbol,'FON:'+FUND_DIRECTORY.find(r=>r.type==='ETF').symbol];
const results=await Promise.all(queries.map(async query=>{
 const instrument=resolveInstrument(query,query).instrument;
 const result=await checkLiveInstrument(instrument);
 return {query,symbol:instrument.symbol,type:instrument.type,kapUrl:instrument.kapUrl,status:result.status,checkedAt:result.asOf,label:result.statusLabel,indices:result.indices,fundProfile:result.fundProfile};
}));
writeFileSync('docs/live-coverage-2026-10-12.json',JSON.stringify(results,null,2));
console.log(results.map(r=>({query:r.query,status:r.status,checkedAt:r.checkedAt,label:r.label,fundProfile:r.fundProfile})));
