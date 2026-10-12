import { readFileSync } from 'node:fs';
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { createServer } from '../server.js';
import { FastifyInstance } from 'fastify';
import { ComplianceStatus, InstrumentType } from '@katilim/shared-types';

describe('Katılım API Integration Tests', () => {
  let server: FastifyInstance;
  const originalFetch=globalThis.fetch;
  const fixture=readFileSync(new URL('../../../../kap-petkm-fixture.html',import.meta.url),'utf8');
  const fundFixture=readFileSync(new URL('../../../../kap-fund-kua-fixture.html',import.meta.url),'utf8');
  const bist=readFileSync(new URL('../../../../bist-membership-fixture.csv',import.meta.url),'utf8');
  const kafif=readFileSync(new URL('../../../../kap-kafif-fixture.html',import.meta.url),'utf8');
  const profile=readFileSync(new URL('../../../../tefas-profile-fixture.json',import.meta.url),'utf8');
  const allocation=readFileSync(new URL('../../../../tefas-allocation-fixture.json',import.meta.url),'utf8');

  before(async () => {
    globalThis.fetch = (async (input: any) => {
      const url=String(input);
      return {ok:true,url,text:async()=>url.includes('.csv')?bist:url.includes('KPY97')?kafif:url.includes('fonProfil')?profile:url.includes('dagilim')?allocation:fundFixture} as Response;
    }) as typeof fetch;
    server = await createServer();
    await server.ready();
  });

  after(async () => {
    await server.close();
    globalThis.fetch=originalFetch;
  });

  it('GET /api/v1/compliance/check for TOASO returns membership separately from unverified financials', async () => {
    const res = await server.inject({
      method: 'GET',
      url: '/api/v1/compliance/check?q=TOASO'
    });

    assert.strictEqual(res.statusCode, 200);
    const body = JSON.parse(res.payload);
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.resolution.isResolved, true);
    assert.strictEqual(body.resolution.instrument.symbol, 'TOASO');
    assert.strictEqual(body.resolution.instrument.type, InstrumentType.STOCK);
    assert.strictEqual(body.evaluation.status, ComplianceStatus.UNCERTAIN);
    assert.strictEqual(body.evaluation.statusBadgeVariant, 'warning');
    assert.strictEqual(body.evaluation.criteria.length, 7);
    assert.ok(body.evaluation.indices.length >= 4);
    assert.strictEqual(body.evaluation.indices.find((i: any) => i.indexCode === 'XKTUM')?.isMember, false);
  });

  it('GET /api/v1/compliance/check for Turkish company name "Tofaş" resolves to TOASO', async () => {
    const res = await server.inject({
      method: 'GET',
      url: '/api/v1/compliance/check?q=Tofaş%20285%20TL'
    });

    assert.strictEqual(res.statusCode, 200);
    const body = JSON.parse(res.payload);
    assert.strictEqual(body.resolution.instrument.symbol, 'TOASO');
  });

  it('GET /api/v1/compliance/check for SASA does not infer debt ratios from a static list', async () => {
    const res = await server.inject({
      method: 'GET',
      url: '/api/v1/compliance/check?q=SASA'
    });

    assert.strictEqual(res.statusCode, 200);
    const body = JSON.parse(res.payload);
    assert.strictEqual(body.evaluation.status, ComplianceStatus.UNCERTAIN);
    assert.strictEqual(body.evaluation.statusBadgeVariant, 'warning');
  });

  it('GET /api/v1/compliance/check for KUA reads its official umbrella without inferring portfolio approval', async () => {
    const res = await server.inject({
      method: 'GET',
      url: '/api/v1/compliance/check?q=KUA'
    });

    assert.strictEqual(res.statusCode, 200);
    const body = JSON.parse(res.payload);
    assert.strictEqual(body.resolution.instrument.symbol, 'KUA');
    assert.strictEqual(body.resolution.instrument.type, InstrumentType.MUTUAL_FUND);
    assert.strictEqual(body.evaluation.status, ComplianceStatus.UNCERTAIN);
    assert.strictEqual(body.evaluation.fundProfile.reportedParticipation,true);
    assert.strictEqual(body.evaluation.criteria.length,0);
    assert.ok(body.evaluation.fundData.allocation.length>0);
    assert.strictEqual(body.evaluation.indices.length, 0); // No stock indices for funds
  });

  it('GET /api/v1/instruments/search returns autocomplete list', async () => {
    const res = await server.inject({
      method: 'GET',
      url: '/api/v1/instruments/search?q=mavi'
    });

    assert.strictEqual(res.statusCode, 200);
    const body = JSON.parse(res.payload);
    assert.ok(body.results.length >= 1);
    assert.strictEqual(body.results[0].symbol, 'MAVI');
  });

  it('GET /api/v1/health returns healthy status and adapter diagnostics', async () => {
    const res = await server.inject({
      method: 'GET',
      url: '/api/v1/health'
    });

    assert.strictEqual(res.statusCode, 200);
    const body = JSON.parse(res.payload);
    assert.strictEqual(body.status, 'degraded');
    assert.strictEqual(body.adapters.bist.isHealthy,false);
    assert.strictEqual(body.adapters.kap.isHealthy,false);
  });
});
