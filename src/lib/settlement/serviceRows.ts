// 용역 정산 목록 행 파생 — paid 청구서에서 (작가 × 거래) 단위 행을 만든다.
// 비영속: 행 데이터는 청구서에서 계산하고, 상태(미정산/정산완료)만 settledKeys로 주입한다.
// 멀티작가 항목은 각 작가에게 항목 writerPay 전액을 귀속(기존 service POST 동작과 동일).

import type { Invoice, InvoiceItem } from '@/types/invoice';
import { getInternalItems, calcItemBreakdown } from '@/lib/invoice/calculator';

// 상세 모달용 항목 내역(작업내용 + 지급액)
export interface SettlementRowItem {
  description: string;
  writer_pay: number;
}

// 목록 한 행 = 한 청구서(거래)에서 한 작가의 지급액 합산
export interface SettlementRow {
  invoice_id: string;
  writer_name: string;
  client_name: string;      // 업체명(거래처)
  title: string;            // 거래명(invoice.title)
  writer_pay: number;       // 해당 작가 지급액 합
  paid_at: string | null;   // 입금 완료 시각
  status: 'settled' | 'unsettled';
  items: SettlementRowItem[];
}

// 상태 식별 키 — (invoice_id, writer_name)
export function settlementKey(invoiceId: string, writerName: string): string {
  return `${invoiceId}::${writerName}`;
}

// paid 청구서 + 정산완료 키 집합 → 목록 행 배열
export function buildSettlementRows(
  invoices: Invoice[],
  settledKeys: Set<string>,
): SettlementRow[] {
  const rows: SettlementRow[] = [];

  for (const inv of invoices) {
    // 작가명 → { 지급액 합, 항목 내역 }
    const byWriter = new Map<string, { sum: number; items: SettlementRowItem[] }>();

    for (const it of getInternalItems((inv.items ?? []) as InvoiceItem[])) {
      const { writerPay } = calcItemBreakdown(it);
      const names = it.writer_names.split(',').map((n) => n.trim()).filter(Boolean);
      // 같은 항목에 동일 작가 중복 표기 방어
      for (const name of Array.from(new Set(names))) {
        const acc = byWriter.get(name) ?? { sum: 0, items: [] };
        acc.sum += writerPay;
        acc.items.push({ description: it.description, writer_pay: writerPay });
        byWriter.set(name, acc);
      }
    }

    for (const [writer_name, agg] of byWriter) {
      rows.push({
        invoice_id: inv.id,
        writer_name,
        client_name: inv.client?.name ?? '',
        title: inv.title,
        writer_pay: agg.sum,
        paid_at: inv.paid_at,
        status: settledKeys.has(settlementKey(inv.id, writer_name)) ? 'settled' : 'unsettled',
        items: agg.items,
      });
    }
  }

  return rows;
}
