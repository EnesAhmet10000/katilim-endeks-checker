import {describe,it} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseBistMembership,parseKafif,parseTefasAllocation,parseTefasProfile,fetchPublic} from '../public-sources.js';
import {resolveCompany} from '../live-data.js';
import {resolveInstrument} from '../instrument-registry.js';
const root=new URL('../../../../',import.meta.url);
const csv=readFileSync(new URL('bist-membership-fixture.csv',root),'utf8');
const kafif=readFileSync(new URL('kap-kafif-fixture.html',root),'utf8');
const profile=JSON.parse(readFileSync(new URL('tefas-profile-fixture.json',root),'utf8'));
const allocation=JSON.parse(readFileSync(new URL('tefas-allocation-fixture.json',root),'utf8'));
const petkm=resolveCompany('PETKM')!; const kua=resolveInstrument('FON:KUA','KUA').instrument!;
const now='2026-10-12T12:00:00Z';
describe('Free official sources: dates, identities, missing values and safe transport',()=>{
 it('reads all seven indices with actual codes and dated membership',()=>{
  const result=parseBistMembership(csv,petkm,now);
  assert.equal(result.date,'2026-10-12');assert.equal(result.indices.length,7);
  assert.equal(result.indices[0].isMember,true);assert.equal(result.indices[1].indexCode,'XK100');
  assert.equal(result.indices[6].isMember,false);
  assert.equal(parseBistMembership(csv,resolveCompany('AKBNK')!,now).indices[0].isMember,false);
 });
 it('rejects truncated, stale, future, mixed-date or changed CSV',()=>{
  for(const body of ['Access denied',csv.split('\n').slice(0,10).join('\n'),csv.replace(/12\/10\/2026/g,'01/01/2020'),csv.replace(/12\/10\/2026/g,'20/10/2026'),csv.replace('12/10/2026','11/10/2026'),csv.replace(/XKTUM/g,'NEWINDEX')]) assert.throws(()=>parseBistMembership(body,petkm,now));
  assert.equal(parseBistMembership(csv.replace(/12\/10\/2026/g,'13/10/2026'),petkm,now).upcoming,true);
 });
 it('reads real KAFIF disclosures without making a full verdict from ratios',()=>{
  const result=parseKafif(kafif,petkm,now);assert.equal(result.period,'2026 / 6 Aylık');
  assert.equal(result.criteria[4].actualValue,.25);assert.equal(result.criteria[5].actualValue,2.99);assert.equal(result.criteria[6].actualValue,24.19);
  assert.ok(result.criteria.every(c=>c.isPassed===null));
  assert.equal(parseKafif(kafif,resolveCompany('BIMAS')!,now).criteria[4].actualValue,0);
  assert.throws(()=>parseKafif(kafif,{...petkm,name:'WRONG COMPANY'},now));assert.throws(()=>parseKafif('blocked',petkm,now));
 });
 it('does not substitute zero or HAYIR for missing KAFIF fields',()=>{
  const result=parseKafif(kafif.replace(/>0,25</g,'><'),petkm,now);
  assert.equal(result.criteria[4].actualValue,undefined);assert.ok(result.warnings.length);
 });
 it('reads annual KAP periods and still rejects future annual reports',()=>{
  const annual=kafif.replace(/2026 \/ 6 Aylık/g,'2025 / Yıllık');
  const result=parseKafif(annual,petkm,now);
  assert.equal(result.period,'2025 / Yıllık');assert.equal(result.criteria.length,7);
  assert.equal(result.criteria[4].actualValue,.25);
  assert.throws(()=>parseKafif(annual.replace(/2025 \/ Yıllık/g,'2026 / Yıllık'),petkm,now));
 });
 it('verifies fund identity and does not turn null interest-content into interest-free',()=>{
  const result=parseTefasProfile(profile,kua);assert.equal(result.isin,'TRYKTPY00715');assert.equal(result.interestContent,undefined);
  assert.throws(()=>parseTefasProfile(profile,{...kua,symbol:'TTE'}));assert.throws(()=>parseTefasProfile({errorCode:'429',resultList:[]},kua));
 });
 it('selects newest verified allocation and preserves source numbers',()=>{
  const result=parseTefasAllocation(allocation,kua,now);assert.equal(result.allocationDate,'2026-10-12');
  assert.equal(result.allocation.find(a=>a.code==='hs')?.percent,65.5);assert.ok(Math.abs(result.allocation.reduce((s,a)=>s+a.percent,0)-100)<.001);
  assert.throws(()=>parseTefasAllocation(allocation,kua,'2026-12-01T12:00:00Z'));
  const changed=structuredClone(allocation);changed.resultList[0].hs=200;assert.throws(()=>parseTefasAllocation(changed,kua,now));
  changed.resultList[0].hs='65.5';assert.throws(()=>parseTefasAllocation(changed,kua,now));
 });
 it('blocks arbitrary destinations before requesting them',async()=>{
  await assert.rejects(fetchPublic('http://www.kap.org.tr/'));
  await assert.rejects(fetchPublic('https://evil.example/'));
  await assert.rejects(fetchPublic('https://www.tefas.gov.tr/api/funds/unknown'));
 });
});
