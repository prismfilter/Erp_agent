import { CalculationResult } from '@/types';

export interface SettlementItemInput {
  amount: number;
  rate: number;
}

/**
 * 정산서 계산 엔진
 * 작가정산서 샘플.xlsx 수식 기준
 */
export function calculateSettlement(items: SettlementItemInput[]): CalculationResult {
  // 1. 합계
  const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);

  // 2. 수수료 (ROUNDDOWN(SUMPRODUCT(지급액 × 수수료율)))
  const totalFee = Math.floor(
    items.reduce((sum, item) => sum + item.amount * (item.rate / 100), 0)
  );

  // 3. 과세 대상 금액
  const taxableAmount = totalAmount - totalFee;

  // 4. 소득세 (ROUNDDOWN((합계-수수료) × 3%, -1))
  // -1은 10 단위로 버림을 의미
  const incomeTax = Math.floor((taxableAmount * 0.03) / 10) * 10;

  // 5. 지방소득세 (ROUNDDOWN(소득세 × 10%, -1))
  const localIncomeTax = Math.floor((incomeTax * 0.10) / 10) * 10;

  // 6. 공제액 합계
  const totalDeduction = totalFee + incomeTax + localIncomeTax;

  // 7. 실수령액 (IF(합계-공제액>0, 합계-공제액, 0))
  const netAmount = Math.max(totalAmount - totalDeduction, 0);

  // 8. 검증: netAmount + totalDeduction = totalAmount (오차 범위 ±1원)
  const isValid = Math.abs(netAmount + totalDeduction - totalAmount) <= 1;

  return {
    totalAmount,
    totalFee,
    taxableAmount,
    incomeTax,
    localIncomeTax,
    totalDeduction,
    netAmount,
    isValid,
  };
}

/**
 * 포맷팅: 숫자를 한국 화폐 형식으로 변환
 * 예: 1234567 → "1,234,567"
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ko-KR').format(Math.floor(amount));
}

/**
 * 백분율 포맷팅
 * 예: 0.20 → "20%"
 */
export function formatPercent(rate: number): string {
  return `${Math.round(rate)}%`;
}

/**
 * 비율을 백분율로 변환
 * 예: 20 → 0.20
 */
export function percentToRatio(percent: number): number {
  return percent / 100;
}

/**
 * 백분율을 비율로 변환
 * 예: 0.20 → 20
 */
export function ratioToPercent(ratio: number): number {
  return Math.round(ratio * 100);
}
