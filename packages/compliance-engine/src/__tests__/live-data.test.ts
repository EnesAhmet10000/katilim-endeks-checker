import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseCompanyDirectory, resolveCompany, sourceLinks, parseKapMembership, unverifiedEvaluation } from '../live-data.js';
const root=new URL('../../../../',import.meta.url);
const directoryHtml=readFileSync(new URL('kap-directory-fixture.html',root),'utf8');
const companyHtml=readFileSync(new URL('kap-petkm-fixture.html',root),'utf8');
describe('Official KAP identities and fail-closed membership parsing',()=>{
 it('reads the real directory and resolves Turkish names to PETKM',()=>{
  const directory=parseCompanyDirectory(directoryHtml);
  assert.ok(directory.length>500);
  for(const query of ['PETKM','Petkim','PETKİM','petkım','PETKİM PETROKİMYA HOLDİNG A.Ş.']) {
   const company=resolveCompany(query,directory)!;
   assert.equal(company.symbol,'PETKM');
   assert.equal(sourceLinks(company).kap,'https://www.kap.org.tr/tr/sirket-bilgileri/ozet/1053-petkim-petrokimya-holding-a-s');
   assert.equal(sourceLinks(company).helalFinans,'https://helalfinans.net/hisseler/PETKM');
  }
 });
 it('reads membership without inventing financial ratios or a full compliance verdict',()=>{
  const result=parseKapMembership(companyHtml,resolveCompany('PETKM')!,'2026-10-12T10:00:00Z');
  assert.equal(result.status,'UNCERTAIN');
  assert.equal(result.indices.length,4);
  assert.ok(result.indices.every(i=>i.isMember));
  assert.deepEqual(result.criteria,[]);
  assert.equal(result.sources.length,1);
 });
 it('rejects changed markup, navigation-only data, wrong companies and block pages',()=>{
  assert.throws(()=>parseCompanyDirectory('<html>Access denied</html>'));
  assert.throws(()=>parseKapMembership(companyHtml,resolveCompany('THYAO')!,'now'));
  assert.throws(()=>parseKapMembership('<div>PETKM</div><a>BIST KATILIM TUM</a>',resolveCompany('PETKM')!,'now'));
 });
 it('unknown data has no false timestamp, ratios, sources or negative membership',()=>{
  const result=unverifiedEvaluation(resolveCompany('PETKM')!);
  assert.equal(result.asOf,'');assert.deepEqual(result.criteria,[]);assert.deepEqual(result.indices,[]);assert.deepEqual(result.sources,[]);
  assert.equal(sourceLinks({...result.instrument,kapUrl:'https://evil.example/'}).kap,'https://www.kap.org.tr/tr/bist-sirketler');
 });
});
