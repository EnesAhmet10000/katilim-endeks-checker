import { describe, it } from 'node:test';
import assert from 'node:assert';
import { ComplianceEngine } from '../engine.js';
import { ComplianceStatus, InstrumentType } from '@katilim/shared-types';

describe('ComplianceEngine Unit Tests', () => {
  const engine = new ComplianceEngine();

  it('evaluates compliant BIST stock accurately', () => {
    const evaluation = engine.evaluateStock({
      instrument: {
        id: 'toaso',
        symbol: 'TOASO',
        name: 'Tofaş Türk Otomobil Fabrikası A.Ş.',
        type: InstrumentType.STOCK
      },
      financials: {
        financialPeriod: '2026/06',
        nonCompliantIncomeRatio: 1.2,
        interestBearingAssetsRatio: 15.4,
        interestBearingDebtRatio: 22.1,
        hasProhibitedActivity: false,
        hasPrivilegedShares: false,
        isConsolidated: true
      },
      indices: [
        { indexCode: 'XKTM', indexName: 'BIST Katılım Tüm', isIncluded: true, period: '2026-H1' },
        { indexCode: 'XKT100', indexName: 'BIST Katılım 100', isIncluded: true, period: '2026-H1' },
        { indexCode: 'XKT50', indexName: 'BIST Katılım 50', isIncluded: true, period: '2026-H1' },
        { indexCode: 'XKT30', indexName: 'BIST Katılım 30', isIncluded: true, period: '2026-H1' }
      ]
    });

    assert.strictEqual(evaluation.status, ComplianceStatus.COMPLIANT);
    assert.strictEqual(evaluation.statusBadgeVariant, 'success');
    assert.strictEqual(evaluation.criteria.length, 5);
    assert.ok(evaluation.criteria.every(c => c.isPassed));
    assert.strictEqual(evaluation.indices.find(i => i.indexCode === 'XKTM')?.isMember, true);
  });

  it('evaluates non-compliant stock with exceeded debt ratio and prohibited activity', () => {
    const evaluation = engine.evaluateStock({
      instrument: {
        id: 'bad-stock',
        symbol: 'TESTS',
        name: 'Test Non-Compliant A.Ş.',
        type: InstrumentType.STOCK
      },
      financials: {
        financialPeriod: '2026/06',
        nonCompliantIncomeRatio: 7.5, // > 5%
        interestBearingAssetsRatio: 10.0,
        interestBearingDebtRatio: 45.0, // > 33%
        hasProhibitedActivity: true,
        prohibitedActivityDescription: 'Alkollü içecek dağıtımı',
        hasPrivilegedShares: false
      },
      indices: [
        { indexCode: 'XKTM', indexName: 'BIST Katılım Tüm', isIncluded: false }
      ]
    });

    assert.strictEqual(evaluation.status, ComplianceStatus.NON_COMPLIANT);
    assert.strictEqual(evaluation.statusBadgeVariant, 'danger');
    const incomeCrit = evaluation.criteria.find(c => c.id === 'CRIT_INCOME');
    const debtCrit = evaluation.criteria.find(c => c.id === 'CRIT_DEBT');
    const actCrit = evaluation.criteria.find(c => c.id === 'CRIT_ACTIVITY');

    assert.strictEqual(incomeCrit?.isPassed, false);
    assert.strictEqual(debtCrit?.isPassed, false);
    assert.strictEqual(actCrit?.isPassed, false);
  });

  it('handles insufficient data gracefully when no records exist', () => {
    const evaluation = engine.evaluateStock({
      instrument: {
        id: 'unknown',
        symbol: 'UNKNW',
        name: 'Bilinmeyen Şirket A.Ş.',
        type: InstrumentType.STOCK
      },
      financials: null,
      indices: []
    });

    assert.strictEqual(evaluation.status, ComplianceStatus.INSUFFICIENT_DATA);
    assert.strictEqual(evaluation.statusBadgeVariant, 'neutral');
  });

  it('evaluates Katılım mutual fund correctly', () => {
    const evaluation = engine.evaluateFund({
      instrument: {
        id: 'kua',
        symbol: 'KUA',
        name: 'Kuveyt Türk Portföy Agresif Katılım Fonu',
        type: InstrumentType.MUTUAL_FUND,
        umbrellaFund: 'Katılım Şemsiye Fonu'
      },
      fundData: {
        fundName: 'Kuveyt Türk Portföy Agresif Katılım Fonu',
        tefasCode: 'KUA',
        umbrellaFundCategory: 'Katılım Şemsiye Fonu',
        fundType: 'Katılım Hisse Senedi Fonu',
        hasShariaBoardApproval: true
      }
    });

    assert.strictEqual(evaluation.status, ComplianceStatus.COMPLIANT);
    assert.strictEqual(evaluation.indices.length, 0); // Funds should not have stock indices
    assert.strictEqual(evaluation.criteria.length, 3);
    assert.ok(evaluation.criteria.every(c => c.isPassed));
  });

  it('evaluates conventional fund as non-compliant', () => {
    const evaluation = engine.evaluateFund({
      instrument: {
        id: 'tcd',
        symbol: 'TCD',
        name: 'Tacirler Portföy Değişken Fon',
        type: InstrumentType.MUTUAL_FUND,
        umbrellaFund: 'Değişken Şemsiye Fonu'
      },
      fundData: {
        fundName: 'Tacirler Portföy Değişken Fon',
        tefasCode: 'TCD',
        umbrellaFundCategory: 'Değişken Şemsiye Fonu',
        fundType: 'Değişken Fon',
        hasShariaBoardApproval: false
      }
    });

    assert.strictEqual(evaluation.status, ComplianceStatus.NON_COMPLIANT);
    assert.strictEqual(evaluation.statusBadgeVariant, 'danger');
  });
});
