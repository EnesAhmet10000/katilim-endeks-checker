import {readFileSync,writeFileSync} from 'node:fs';
const html=readFileSync('kap-funds-directory-fixture.html','utf8');
const strip=s=>s.replace(/<[^>]*>/g,' ').replace(/&amp;/g,'&').replace(/\s+/g,' ').trim();
const entries=[];
for(const row of html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/g)) {
 const links=[...row[1].matchAll(/<a\b[^>]*href="(\/tr\/fon-bilgileri\/ozet\/[a-z0-9-]+)"[^>]*>([\s\S]*?)<\/a>/g)];
 if(links.length<2)continue;
 const symbol=strip(links[0][2]),name=strip(links[1][2]);
 if(!/^[A-Z0-9]{3,6}$/.test(symbol))continue;
 entries.push({symbol,name,kapUrl:'https://www.kap.org.tr'+links[0][1],type:/EMEKLİLİK/i.test(name)?'PENSION_FUND':/BORSA YATIRIM FONU/i.test(name)?'ETF':'MUTUAL_FUND'});
}
writeFileSync('packages/compliance-engine/src/fund-directory.ts','// KAP identity snapshot only, not a verified mandate or current portfolio.\nexport const FUND_DIRECTORY_SNAPSHOT_DATE="2026-10-12";\nexport const FUND_DIRECTORY = '+JSON.stringify(entries,null,2)+';\n');
console.log({entries:entries.length,unique:new Set(entries.map(r=>r.symbol)).size,samples:['KUA','KTV','TTE','IPB'].map(symbol=>entries.find(r=>r.symbol===symbol))});
