import { describe, it, expect } from 'vitest';
import {
  calculateSettlement,
  formatCurrency,
  formatWon,
  formatPercent,
  percentToRatio,
  ratioToPercent,
} from './calculator';

describe('calculateSettlement', () => {
  it('지급액 100만 원 / 수수료율 20% 정산을 정확히 계산한다', () => {
    const r = calculateSettlement([{ amount: 1_000_000, rate: 20 }]);
    expect(r.totalAmount).toBe(1_000_000);
    expect(r.totalFee).toBe(200_000); // floor(1,000,000 * 0.2)
    expect(r.taxableAmount).toBe(800_000);
    expect(r.incomeTax).toBe(24_000); // floor(800,000 * 0.03 / 10) * 10
    expect(r.localIncomeTax).toBe(2_400); // floor(24,000 * 0.1 / 10) * 10
    expect(r.totalDeduction).toBe(226_400);
    expect(r.netAmount).toBe(773_600);
    expect(r.isValid).toBe(true);
  });

  it('실수령액 + 공제액 = 합계 (검증 통과)', () => {
    const r = calculateSettlement([
      { amount: 333_333, rate: 15 },
      { amount: 777_777, rate: 30 },
    ]);
    expect(r.netAmount + r.totalDeduction).toBe(r.totalAmount);
    expect(r.isValid).toBe(true);
  });

  it('빈 항목은 모두 0', () => {
    const r = calculateSettlement([]);
    expect(r.totalAmount).toBe(0);
    expect(r.netAmount).toBe(0);
    expect(r.isValid).toBe(true);
  });

  it('소득세는 10원 단위로 버림한다', () => {
    // taxable * 0.03 가 10원 미만 끝자리를 가질 때 버림 확인
    const r = calculateSettlement([{ amount: 12_345, rate: 0 }]);
    expect(r.taxableAmount).toBe(12_345);
    // floor(12,345 * 0.03 / 10) * 10 = floor(37.035) * 10 = 370
    expect(r.incomeTax).toBe(370);
  });
});

describe('포맷 유틸', () => {
  it('formatCurrency는 천 단위 콤마를 적용한다', () => {
    expect(formatCurrency(1_234_567)).toBe('1,234,567');
    expect(formatCurrency(0)).toBe('0');
  });

  it('formatWon은 콤마 + 공백 + 원을 붙인다', () => {
    expect(formatWon(1_000_000)).toBe('1,000,000 원');
  });

  it('formatPercent는 반올림 백분율을 표시한다', () => {
    expect(formatPercent(20)).toBe('20%');
    expect(formatPercent(19.6)).toBe('20%');
  });

  it('percentToRatio / ratioToPercent 왕복 변환', () => {
    expect(percentToRatio(20)).toBe(0.2);
    expect(ratioToPercent(0.2)).toBe(20);
  });
});
