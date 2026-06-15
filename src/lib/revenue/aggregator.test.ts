import { describe, it, expect } from 'vitest';
import type { Invoice, InvoiceItem, PriceItem } from '@/types/invoice';
import { aggregateRevenue, getQuarter, calcYoY } from './aggregator';

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

function invoice(date: string, items: InvoiceItem[], id = 'inv'): Invoice {
  return {
    id,
    invoice_date: date,
    client_id: null,
    title: 't',
    account_id: null,
    status: 'paid',
    memo: null,
    created_at: date,
    updated_at: date,
    items,
  };
}

const priceItems: PriceItem[] = [
  {
    id: 'pi-album',
    category: '앨범',
    name: '앨범 작업',
    billing_price: 1_000_000,
    writer_base_pay: 600_000,
    fee_rate: 0.2,
    is_formula: false,
    formula_note: null,
    sort_order: 1,
    is_active: true,
    deleted_at: null,
  },
];

describe('aggregateRevenue', () => {
  it('귀속금액(C)을 분기·연도·카테고리별로 합산한다', () => {
    const data = aggregateRevenue(
      [invoice('2026-05-10', [item({ price_item_id: 'pi-album', supply_amount: 1_000_000 })])],
      priceItems
    );
    // 2026-05 → Q2. 작가수수료 70% → 귀속 = 1,000,000 × 30% = 300,000
    expect(getQuarter(data, 2026, 2).total).toBe(300_000);
    expect(getQuarter(data, 2026, 2).count).toBe(1);
    expect(data.byYear[2026]).toBe(300_000);
    expect(data.byCategory['앨범'][2026]).toBe(300_000);
    expect(data.years).toEqual([2026]);
  });

  it('price_item_id가 없는 행은 커스텀으로 분류한다', () => {
    const data = aggregateRevenue(
      [invoice('2026-02-01', [item({ price_item_id: null, supply_amount: 500_000 })])],
      priceItems
    );
    // 500,000 × 30% = 150,000
    expect(data.byCategory['커스텀'][2026]).toBe(150_000);
    expect(getQuarter(data, 2026, 1).total).toBe(150_000);
  });

  it('할인금액이 순매출에서 차감되어 귀속이 줄어든다', () => {
    const data = aggregateRevenue(
      [
        invoice('2026-08-01', [
          item({ price_item_id: 'pi-album', supply_amount: 1_000_000, discount_amount: 100_000 }),
        ]),
      ],
      priceItems
    );
    // net 900,000 × 30% = 270,000 (Q3)
    expect(getQuarter(data, 2026, 3).total).toBe(270_000);
  });

  it('여러 연도는 내림차순으로 정렬된다', () => {
    const data = aggregateRevenue(
      [
        invoice('2025-03-01', [item({ supply_amount: 100 })], 'a'),
        invoice('2026-03-01', [item({ supply_amount: 200 })], 'b'),
      ],
      priceItems
    );
    expect(data.years).toEqual([2026, 2025]);
  });

  it('invoice_date가 없는 청구서는 건너뛴다', () => {
    const data = aggregateRevenue([invoice('', [item({ supply_amount: 100 })])], priceItems);
    expect(data.years).toEqual([]);
  });
});

describe('calcYoY', () => {
  it('전년 대비 증감률을 계산한다', () => {
    expect(calcYoY(150, 100)).toBe(50);
    expect(calcYoY(50, 100)).toBe(-50);
  });

  it('전년이 0이면 null', () => {
    expect(calcYoY(100, 0)).toBeNull();
  });
});
