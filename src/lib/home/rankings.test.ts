import { describe, it, expect } from 'vitest';
import type { Invoice, InvoiceItem, ServiceSettlement, Client } from '@/types/invoice';
import { buildWriterRanking, buildClientRanking } from './rankings';

// 최소 픽스처 — 테스트에 필요한 필드만 채우고 캐스팅
function settlement(writer: string, periodStart: string, amount: number): ServiceSettlement {
  return { writer_name: writer, period_start: periodStart, total_amount: amount } as unknown as ServiceSettlement;
}

function invoice(date: string, clientName: string | null, items: { supply: number; rate: number }[]): Invoice {
  return {
    invoice_date: date,
    client: clientName ? ({ name: clientName } as Client) : null,
    items: items.map((it, i) => ({
      no: i + 1,
      supply_amount: it.supply,
      discount_amount: 0,
      writer_pay_rate: it.rate,
      show_in_external: true,
      writer_names: '',
      item_type: 'normal',
    } as unknown as InvoiceItem)),
  } as unknown as Invoice;
}

describe('buildWriterRanking', () => {
  it('연도 일치 정산만 작가별 합산·내림차순', () => {
    const list = [
      settlement('김작가', '2026-03-01', 500),
      settlement('이작가', '2026-06-01', 900),
      settlement('김작가', '2026-09-01', 300),
      settlement('박작가', '2025-05-01', 999), // 다른 연도 제외
    ];
    expect(buildWriterRanking(list, 2026)).toEqual([
      { name: '이작가', amount: 900 },
      { name: '김작가', amount: 800 },
    ]);
  });
  it('0/빈 입력은 빈 배열', () => {
    expect(buildWriterRanking([], 2026)).toEqual([]);
    expect(buildWriterRanking([settlement('김작가', '2026-01-01', 0)], 2026)).toEqual([]);
  });
});

describe('buildClientRanking', () => {
  it('연도 일치 paid 청구서의 귀속금액을 거래처별 합산·내림차순', () => {
    // 귀속금액 = 순매출 − trunc(순매출×rate/100). supply=1,000,000 rate=70 → 300,000
    const invoices = [
      invoice('2026-06-01', 'A거래처', [{ supply: 1_000_000, rate: 70 }]), // 300,000
      invoice('2026-06-10', 'B거래처', [{ supply: 1_000_000, rate: 30 }]), // 700,000
      invoice('2026-07-01', 'A거래처', [{ supply: 1_000_000, rate: 70 }]), // +300,000 = 600,000
      invoice('2025-01-01', 'C거래처', [{ supply: 1_000_000, rate: 10 }]), // 다른 연도 제외
    ];
    const r = buildClientRanking(invoices, 2026);
    expect(r).toEqual([
      { name: 'B거래처', amount: 700_000 },
      { name: 'A거래처', amount: 600_000 },
    ]);
  });
  it('거래처명 없으면 미지정', () => {
    const r = buildClientRanking([invoice('2026-06-01', null, [{ supply: 1_000_000, rate: 70 }])], 2026);
    expect(r).toEqual([{ name: '미지정', amount: 300_000 }]);
  });
  it('빈 입력은 빈 배열', () => {
    expect(buildClientRanking([], 2026)).toEqual([]);
  });
});
