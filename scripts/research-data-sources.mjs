import {mkdirSync,writeFileSync} from 'node:fs';
mkdirSync('.research',{recursive:true});
const sources={
 'kap-provider.py':'https://raw.githubusercontent.com/saidsurucu/borsa-mcp/main/providers/kap_provider.py',
 'tefas-provider.py':'https://raw.githubusercontent.com/saidsurucu/borsapy/master/borsapy/_providers/tefas.py',
 'bist-participation.html':'https://borsaistanbul.com/katilim-esasli-paylar-ve-pay-endeksleri',
 'kap-kafif.html':'https://www.kap.org.tr/tr/kfifAllInfoListByItem/KPY97SummaryGrid',
 'bist-participation.csv':'https://borsaistanbul.com/datum/hisse_endeks_katilim_ds.csv'
};
const results=await Promise.all(Object.entries(sources).map(async([name,url])=>{
 try {const r=await fetch(url,{signal:AbortSignal.timeout(25000)});const body=await r.text();writeFileSync('.research/'+name,body);return {name,url,status:r.status,contentType:r.headers.get('content-type'),length:body.length,firstLine:name.endsWith('.csv')?body.slice(0,350):undefined};}
 catch(e){return {name,url,error:e.message};}
}));
writeFileSync('.research/probe-results.json',JSON.stringify(results,null,2));console.log(results);
