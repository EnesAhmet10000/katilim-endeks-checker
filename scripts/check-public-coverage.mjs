import {writeFileSync} from 'node:fs';
import {resolveInstrument,checkPublicInstrument} from '../packages/compliance-engine/dist/index.js';
const queries=['BIST:PETKM','BIST:BIMAS','BIST:THYAO','BIST:SASA','BIST:AKBNK','BIST:MAVI','FON:KUA','FON:TTE','FON:EAE','FON:APGLD'];
const results=[];
// Sequential checks keep requests modest; shared BIST/KAFIF responses are reused for one hour.
for(const query of queries) {
 const instrument=resolveInstrument(query,query).instrument;
 const evaluation=await checkPublicInstrument(instrument);
 results.push({query,evaluation});
 console.log(query,JSON.stringify({sources:evaluation.sources.length,criteria:evaluation.criteria.length,indices:evaluation.indices.length,allocation:evaluation.fundData?.allocation.length,warnings:evaluation.dataWarnings}));
}
writeFileSync('docs/public-source-coverage-2026-10-12.json',JSON.stringify(results,null,2));
