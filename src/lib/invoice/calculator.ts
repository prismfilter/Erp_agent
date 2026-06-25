// 인보이스 계산 로직 (순수 함수)
// 비즈니스 규칙:
// - 세액 = 공급가액 × 10% (정수, 0 방향 절사 — 할인 행 음수 안전)
// - 귀속금액 = 공급가액 − 작가지급액
// - 외부 합계(A)는 show_in_external 행 기준, 내부 합계(B)는 내부 표시 행 기준
// - 내부 행 분리: 자식(group_key=부모id) 있는 부모는 내부 뷰에서 제외

import type { InvoiceItem, InvoiceTotals } from '@/types/invoice';

// 세액: 10% 절사 (음수도 0 방향)
export function calcLineTax(supply: number): number {
  return Math.trunc(supply * 0.1);
}

// 행 단위 금액 분해 (절사는 0 방향 trunc — 음수 안전)
//   순매출   = 공급가액 − 할인금액
//   작가지급 = trunc(순매출 × 작가수수료율% / 100)
//   귀속금액 = 순매출 − 작가지급
export function calcItemBreakdown(it: {
  supply_amount: number;
  discount_amount: number;
  writer_pay_rate: number;
}): { netSupply: number; writerPay: number; attribution: number } {
  const netSupply = it.supply_amount - it.discount_amount;
  const writerPay = Math.trunc((netSupply * it.writer_pay_rate) / 100);
  const attribution = netSupply - writerPay;
  return { netSupply, writerPay, attribution };
}

// 밴드 계열 카테고리 — 수수료율 20% (그 외 30%). PDF v1 기준.
const BAND_CATEGORIES = new Set(['밴드', '밴드(플레디스)']);

// 카테고리 → 수수료율. 밴드/밴드(플레디스)=0.2, 그 외=0.3.
export function feeRateForCategory(category: string): number {
  return BAND_CATEGORIES.has(category) ? 0.2 : 0.3;
}

// 관리/밴드 수수료 = 희망청구가 × 수수료율 (0 방향 절사)
export function calcFee(billingPrice: number, feeRate: number): number {
  return Math.trunc(billingPrice * feeRate);
}

// 작가 실수령액 = 희망청구가 − 수수료
export function calcWriterNet(billingPrice: number, feeRate: number): number {
  return billingPrice - calcFee(billingPrice, feeRate);
}

// 외부(거래처 청구서) 표시 행 필터
export function getExternalItems(items: InvoiceItem[]): InvoiceItem[] {
  return items.filter((it) => it.show_in_external);
}

// 내부(지급서) 표시 행 필터 — 자식이 있는 부모는 제외, 자식 행 포함
export function getInternalItems(items: InvoiceItem[]): InvoiceItem[] {
  const parentKeys = new Set(
    items.filter((it) => it.group_key).map((it) => it.group_key)
  );
  return items.filter((it) => {
    // 자식 행(내부 전용)은 항상 포함
    if (it.group_key) return true;
    // 자식이 있는 부모는 내부 뷰에서 제외 (자식들이 대신 표시)
    const key = it.id ?? `idx-${it.no}`;
    return !parentKeys.has(key);
  });
}

// 청구서 전체 합계 계산
export function calcInvoiceTotals(items: InvoiceItem[]): InvoiceTotals {
  const external = getExternalItems(items);
  const internal = getInternalItems(items);

  // 순매출(할인 반영) 기준 집계
  const supplyTotal = external.reduce((s, it) => s + calcItemBreakdown(it).netSupply, 0);
  const internalSupplyTotal = internal.reduce((s, it) => s + calcItemBreakdown(it).netSupply, 0);
  const writerPayTotal = internal.reduce((s, it) => s + calcItemBreakdown(it).writerPay, 0);
  const attributionTotal = internal.reduce((s, it) => s + calcItemBreakdown(it).attribution, 0);

  const taxA = calcLineTax(supplyTotal);
  const taxB = calcLineTax(writerPayTotal);
  const taxC = calcLineTax(attributionTotal);
  const grandTotal = supplyTotal + taxA; // 정수 덧셈 (부동소수점 회피)

  const warnings: string[] = [];

  // 외부·내부 순매출 합계 일치 검증 (분리 행 합이 부모와 다르면 어긋남)
  if (supplyTotal !== internalSupplyTotal) {
    warnings.push(
      `외부 합계(${supplyTotal.toLocaleString()})와 내부 합계(${internalSupplyTotal.toLocaleString()})가 일치하지 않습니다.`
    );
  }

  // 세액 정합: A세액 vs B세액+C세액 (절사 오차 ±1원 허용)
  if (Math.abs(taxA - (taxB + taxC)) > 1) {
    warnings.push('세액 합계가 일치하지 않습니다 (반올림 차이 초과).');
  }

  // 할인금액 > 공급가액 행 경고 (저장은 허용 — 전략적 케이스)
  internal.forEach((it) => {
    if (it.discount_amount > it.supply_amount) {
      warnings.push(
        `${it.no}번 행: 할인금액(${it.discount_amount.toLocaleString()})이 공급가액(${it.supply_amount.toLocaleString()})보다 큽니다.`
      );
    }
  });

  return {
    supplyTotal,
    writerPayTotal,
    attributionTotal,
    taxA,
    taxB,
    taxC,
    grandTotal,
    internalSupplyTotal,
    isValid: warnings.length === 0,
    warnings,
  };
}

// description에서 "{title}_" 접두사 제거 — 청구서 표에서 거래명 컬럼과 분리 표시용
export function stripTitlePrefix(description: string, title: string): string {
  const prefix = `${title}_`;
  return title && description.startsWith(prefix) ? description.slice(prefix.length) : description;
}

// 내보내기 파일명 생성: PF_청구서_{거래처}_{거래명}_{YYMMDD} (특수문자 _ 치환)
export function buildExportFilename(clientName: string, title: string, invoiceDate: string): string {
  const d = new Date(invoiceDate);
  const yymmdd = `${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  const sanitize = (s: string) => s.replace(/[\\/:*?"<>|]/g, '_').trim();
  return `PF_청구서_${sanitize(clientName)}_${sanitize(title)}_${yymmdd}`;
}
