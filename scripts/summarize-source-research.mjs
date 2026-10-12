import {readFileSync,writeFileSync} from 'node:fs';
const csv=readFileSync('.research/bist-participation.csv','utf8').trim().split(/\r?\n/).slice(2).map(line=>line.split(';')).filter(row=>row.length===6);
const indices={};for(const [symbol,,code,,,date] of csv){(indices[code]??={count:0,dates:new Set(),symbols:new Set()}).count++;indices[code].dates.add(date);indices[code].symbols.add(symbol.replace(/\.E$/,''));}
const summary=Object.fromEntries(Object.entries(indices).map(([code,row])=>[code,{count:row.count,dates:[...row.dates],hasPETKM:row.symbols.has('PETKM')}]));
const kap=JSON.parse(readFileSync('.research/kafif-summary.json','utf8'));
const tefas=JSON.parse(readFileSync('.research/fund-api-probe.json','utf8'));
const evidence={checkedDate:'2026-10-12',checkedAt:new Date().toISOString(),method:'Direct HTTPS requests with normal certificate verification. No API key, account, remote source execution or bot-challenge bypass.',bist:{url:'https://borsaistanbul.com/datum/hisse_endeks_katilim_ds.csv',httpStatus:200,rows:csv.length,indices:summary},kap:{url:'https://www.kap.org.tr/tr/kfifAllInfoListByItem/KPY97SummaryGrid',httpStatus:200,rows:kap.rows,columns:kap.headings,samples:kap.samples},tefas:{baseUrl:'https://www.tefas.gov.tr/api/funds/',probes:tefas},integrationStatus:'Research probes only. The extension and production API have not been modified to consume these sources.'};
writeFileSync('docs/DATA-SOURCES-EVIDENCE-2026-10-12.json',JSON.stringify(evidence,null,2));console.log(JSON.stringify(evidence.bist,null,2));
