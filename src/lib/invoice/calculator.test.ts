import { describe, it, expect } from 'vitest';
import type { InvoiceItem } from '@/types/invoice';
import {
  calcLineTax,
  calcItemBreakdown,
  calcWriterNet,
  calcFee,
  getExternalItems,
  getInternalItems,
  calcInvoiceTotals,
  buildExportFilename,
} from './calculator';

// 테스트용 InvoiceItem 팩토리 — 기본값에서 필요한 필드만 덮어쓴다
function item(partial: Partial<InvoiceItem>): InvoiceItem {
  return {
    no: 1,
    price_item_id: null,
    description: '',
    writer_names: '',
    supply_amount: 0,
    discount_amount: 0,
    writer_pay_rate: 70,
    writer_pay: 0,
    item_type: 'normal',
    is_negotiated: false,
    note: null,
    show_in_external: true,
    group_key: null,
    ...partial,
  };
}

describe('라인 단위 계산', () => {
  it('calcLineTax는 공급가액의 10%를 0 방향 절사한다', () => {
    expect(calcLineTax(100_000)).toBe(10_000);
    expect(calcLineTax(12_345)).toBe(1_234); // trunc(1234.5)
    expect(calcLineTax(-5_000)).toBe(-500); // 음수 안전 (trunc)
  });

  it('calcItemBreakdown: 공급 100만 / 할인 10만 / 작가수수료 70%', () => {
    const bd = calcItemBreakdown({ supply_amount: 1_000_000, discount_amount: 100_000, writer_pay_rate: 70 });
    expect(bd.netSupply).toBe(900_000); // 100만 − 10만
    expect(bd.writerPay).toBe(630_000); // 90만 × 70%
    expect(bd.attribution).toBe(270_000); // 90만 − 63만
  });

  it('calcItemBreakdown: 작가수수료 0%/100% 경계', () => {
    expect(calcItemBreakdown({ supply_amount: 500_000, discount_amount: 0, writer_pay_rate: 0 }))
      .toEqual({ netSupply: 500_000, writerPay: 0, attribution: 500_000 });
    expect(calcItemBreakdown({ supply_amount: 500_000, discount_amount: 0, writer_pay_rate: 100 }))
      .toEqual({ netSupply: 500_000, writerPay: 500_000, attribution: 0 });
  });

  it('calcItemBreakdown: 작가지급액은 0 방향 절사', () => {
    // 순매출 333,333 × 70% = 233,333.1 → 233,333
    const bd = calcItemBreakdown({ supply_amount: 333_333, discount_amount: 0, writer_pay_rate: 70 });
    expect(bd.writerPay).toBe(233_333);
    expect(bd.attribution).toBe(100_000);
  });

  it('calcWriterNet은 지급액에서 수수료를 뺀다 (기본 20%)', () => {
    expect(calcWriterNet(100_000)).toBe(80_000);
    expect(calcWriterNet(100_000, 0.3)).toBe(70_000);
  });

  it('calcFee는 지급액 × 수수료율을 절사한다', () => {
    expect(calcFee(100_000)).toBe(20_000);
    expect(calcFee(12_345)).toBe(2_469); // trunc(2469.0)
  });
});

describe('외부/내부 행 분리', () => {
  it('getExternalItems는 show_in_external 행만 반환한다', () => {
    const items = [
      item({ id: 'a', show_in_external: true }),
      item({ id: 'b', show_in_external: false }),
    ];
    expect(getExternalItems(items).map((i) => i.id)).toEqual(['a']);
  });

  it('getInternalItems는 자식이 있는 부모를 제외하고 자식 행을 포함한다', () => {
    const items = [
      item({ id: 'p', supply_amount: 100_000, show_in_external: true }),
      item({ id: 'c1', group_key: 'p', supply_amount: 60_000, show_in_external: false }),
      item({ id: 'c2', group_key: 'p', supply_amount: 40_000, show_in_external: false }),
    ];
    const internal = getInternalItems(items);
    expect(internal.map((i) => i.id)).toEqual(['c1', 'c2']); // 부모 p 제외
  });

  it('자식 없는 단독 행은 내부 뷰에 그대로 포함된다', () => {
    const items = [item({ id: 'solo', supply_amount: 50_000 })];
    expect(getInternalItems(items).map((i) => i.id)).toEqual(['solo']);
  });
});

describe('calcInvoiceTotals', () => {
  it('단순 1행 (공급 100만 / 할인 10만 / 작가수수료 70%)', () => {
    const items = [item({ id: 'a', supply_amount: 1_000_000, discount_amount: 100_000, writer_pay_rate: 70 })];
    const t = calcInvoiceTotals(items);
    expect(t.supplyTotal).toBe(900_000); // 순매출(할인 반영)
    expect(t.writerPayTotal).toBe(630_000);
    expect(t.attributionTotal).toBe(270_000);
    expect(t.taxA).toBe(90_000);
    expect(t.grandTotal).toBe(990_000);
    expect(t.isValid).toBe(true);
    expect(t.warnings).toHaveLength(0);
  });

  it('내부 행 분리 시 외부·내부 순매출 합이 일치하면 유효', () => {
    const items = [
      item({ id: 'p', supply_amount: 100_000, show_in_external: true }),
      item({ id: 'c1', group_key: 'p', supply_amount: 60_000, show_in_external: false }),
      item({ id: 'c2', group_key: 'p', supply_amount: 40_000, show_in_external: false }),
    ];
    const t = calcInvoiceTotals(items);
    expect(t.supplyTotal).toBe(100_000); // 외부 = 부모 순매출
    expect(t.internalSupplyTotal).toBe(100_000); // 내부 = 자식 순매출 합
    expect(t.isValid).toBe(true);
  });

  it('할인금액이 공급가액보다 크면 경고를 남긴다', () => {
    const items = [item({ id: 'a', supply_amount: 100_000, discount_amount: 150_000 })];
    const t = calcInvoiceTotals(items);
    expect(t.isValid).toBe(false);
    expect(t.warnings.length).toBeGreaterThan(0);
  });

  it('외부·내부 순매출이 어긋나면 경고를 남긴다', () => {
    const items = [
      item({ id: 'p', supply_amount: 100_000, show_in_external: true }),
      item({ id: 'c1', group_key: 'p', supply_amount: 50_000, show_in_external: false }),
    ];
    const t = calcInvoiceTotals(items);
    expect(t.isValid).toBe(false);
    expect(t.warnings.length).toBeGreaterThan(0);
  });
});

describe('buildExportFilename', () => {
  it('PF_청구서_거래처_거래명_YYMMDD 형식, 특수문자 치환', () => {
    const name = buildExportFilename('A/B 레이블', '광고:음원', '2026-05-09');
    expect(name).toBe('PF_청구서_A_B 레이블_광고_음원_260509');
  });
});
