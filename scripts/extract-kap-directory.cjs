const fs = require('fs');
const html = fs.readFileSync('kap-directory-fixture.html', 'utf8');
const strip = s => s.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').trim();
const grouped = new Map();
for (const m of html.matchAll(/<a\b[^>]*href="(\/tr\/sirket-bilgileri\/ozet\/\d+-[^"]+)"[^>]*>([\s\S]*?)<\/a>/g)) {
 const text=strip(m[2]); const row=grouped.get(m[1])||{url:'https://www.kap.org.tr'+m[1], symbols:[], name:''};
 if (/^[A-Z0-9]{3,6}(?:\s+[A-Z0-9]{3,6})*$/.test(text)) row.symbols=text.split(/\s+/); else row.name=text;
 grouped.set(m[1], row);
}
const entries=[...grouped.values()].filter(r=>r.symbols.length&&r.name).flatMap(r=>r.symbols.map(symbol=>({symbol,name:r.name,kapUrl:r.url})));
fs.writeFileSync('packages/compliance-engine/src/company-directory.ts', '// Identity snapshot only. Membership and financial data are never inferred from this file.\nexport const DIRECTORY_SNAPSHOT_DATE = "2026-10-12";\nexport const COMPANY_DIRECTORY = '+JSON.stringify(entries,null,2)+';\n');
console.log(entries.length,entries.find(r=>r.symbol==='PETKM'));
