import {describe,it} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {COMPANY_DIRECTORY} from '../company-directory.js';
import {FUND_DIRECTORY} from '../fund-directory.js';
import {asInstrument,parseFundDirectory,resolveInstrument,searchInstruments,instrumentQuery} from '../instrument-registry.js';
import {parseKapFund,sourceLinks} from '../live-data.js';
const root=new URL('../../../../',import.meta.url);
const fundHtml=readFileSync(new URL('kap-fund-kua-fixture.html',root),'utf8');
const equityFundHtml=readFileSync(new URL('kap-fund-tte-fixture.html',root),'utf8');
describe('Complete source-directory coverage and fund records',()=>{
 it('resolves every company and fund identity by its explicitly qualified symbol',()=>{
  for(const row of [...COMPANY_DIRECTORY,...FUND_DIRECTORY]) {
   const instrument=asInstrument(row),query=instrumentQuery(instrument);
   const result=resolveInstrument(query,query);
   assert.equal(result.instrument?.symbol,row.symbol,query);
   assert.equal(result.instrument?.type,instrument.type,query);
   assert.equal(result.instrument?.kapUrl,row.kapUrl,query);
  }
 });
 it('parses all official fund directory entries including conventional funds',()=>{
  const directory=parseFundDirectory(readFileSync(new URL('kap-funds-directory-fixture.html',root),'utf8'));
  assert.equal(directory.length,FUND_DIRECTORY.length);
  for(const symbol of ['KUA','KTV','TTE','IPB']) assert.ok(directory.find(r=>r.symbol===symbol));
  assert.ok(directory.some(r=>r.type==='PENSION_FUND'));
  assert.ok(directory.some(r=>r.type==='ETF'));
  assert.throws(()=>parseFundDirectory('<p>blocked</p>'));
 });
 it('resolves full fund names even when noise sanitation removes the word fonu',()=>{
  const row=FUND_DIRECTORY.find(r=>r.symbol==='KUA')!;
  assert.equal(resolveInstrument(row.name,row.name.replace(/ FONU$/,'')).instrument?.symbol,'KUA');
  assert.ok(searchInstruments('PORTFÖY').length);
 });
 it('reads actual KUA umbrella type and links without a full religious verdict',()=>{
  const fund=resolveInstrument('KUA','KUA').instrument!;
  const result=parseKapFund(fundHtml,fund,'2026-10-12T10:00:00Z');
  assert.equal(result.status,'UNCERTAIN');assert.equal(result.fundProfile?.reportedParticipation,true);
  assert.equal(result.fundProfile?.umbrellaType,'KATILIM ŞEMSİYE FONU');
  assert.equal(result.criteria.length,0);assert.equal(result.indices.length,0);
  assert.ok(sourceLinks(fund).kap.includes('/fon-bilgileri/ozet/kua-'));
  assert.ok(sourceLinks(fund).tefas.endsWith('FonKod=KUA'));
 });
 it('keeps conventional umbrella identity separate from declaring a fund impermissible',()=>{
  const fund=resolveInstrument('TTE','TTE').instrument!;
  const result=parseKapFund(equityFundHtml,fund,'2026-10-12T10:00:00Z');
  assert.equal(result.fundProfile?.umbrellaType,'HİSSE SENEDİ ŞEMSİYE FONU');
  assert.equal(result.fundProfile?.reportedParticipation,false);assert.equal(result.status,'UNCERTAIN');
 });
 it('does not infer participation from a name when the umbrella field is missing',()=>{
  const fund=resolveInstrument('KUA','KUA').instrument!;
  const result=parseKapFund(`<div>${fund.symbol}</div><div>${fund.name}</div>`,fund,'now');
  assert.equal(result.fundProfile?.reportedParticipation,null);
  assert.throws(()=>parseKapFund(equityFundHtml,fund,'now'));
 });
 it('requires disambiguation for stock/fund code collisions',()=>{
  const stock={symbol:'ABC',name:'ABC SANAYİ A.Ş.',kapUrl:'https://www.kap.org.tr/tr/sirket-bilgileri/ozet/123-abc'};
  const fund={symbol:'ABC',name:'ABC PORTFÖY FONU',kapUrl:'https://www.kap.org.tr/tr/fon-bilgileri/ozet/abc-fonu',type:'MUTUAL_FUND'};
  assert.equal(resolveInstrument('ABC','ABC',[stock],[fund]).isAmbiguous,true);
  assert.equal(resolveInstrument('FON:ABC','FON ABC',[stock],[fund]).instrument?.type,'MUTUAL_FUND');
  assert.equal(resolveInstrument('BIST:ABC','ABC',[stock],[fund]).instrument?.type,'STOCK');
 });
});
