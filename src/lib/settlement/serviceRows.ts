// 용역 정산 목록 행 파생 — paid 청구서에서 (작가 × 거래) 단위 행을 만든다.
// 비영속: 행 데이터는 청구서에서 계산하고, 상태(미정산/정산완료)만 settledKeys로 주입한다.
// 멀티작가 항목은 각 작가에게 항목 writerPay 전액을 귀속(기존 service POST 동작과 동일).

import type {
  Invoice,
  InvoiceItem,
  ServiceSettlement,
  ServiceSettlementDetailItem,
} from '@/types/invoice';
import { getInternalItems, calcItemBreakdown } from '@/lib/invoice/calculator';

// 상세 모달·정산서 미리보기용 항목 내역(작업내용 + 지급액 + 공급가액/귀속금액)
export interface SettlementRowItem {
  description: string;
  writer_pay: number;
  supply: number;        // 공급가액(순매출) — 정산서 총액 세부내역용
  attribution: number;   // 회사 수수료(귀속금액) — 정산서 총액 세부내역용
}

// 목록 한 행 = 한 청구서(거래)에서 한 작가의 지급액 합산
export interface SettlementRow {
  invoice_id: string;
  writer_name: string;
  client_name: string;      // 업체명(거래처)
  title: string;            // 거래명(invoice.title)
  invoice_date: string;     // 청구일(정산서 detail 스냅샷용)
  writer_pay: number;       // 해당 작가 지급액 합
  paid_at: string | null;   // 입금 완료 시각
  status: 'settled' | 'unsettled';
  doc_number: string;       // 용역 정산서 문서번호(YYYY-NNN호). GET에서 채번 주입, 빈 문자열=미부여
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
      const { netSupply, writerPay, attribution } = calcItemBreakdown(it);
      const names = it.writer_names.split(',').map((n) => n.trim()).filter(Boolean);
      // 같은 항목에 동일 작가 중복 표기 방어
      for (const name of Array.from(new Set(names))) {
        const acc = byWriter.get(name) ?? { sum: 0, items: [] };
        acc.sum += writerPay;
        acc.items.push({
          description: it.description,
          writer_pay: writerPay,
          supply: netSupply,
          attribution,
        });
        byWriter.set(name, acc);
      }
    }

    for (const [writer_name, agg] of byWriter) {
      rows.push({
        invoice_id: inv.id,
        writer_name,
        client_name: inv.client?.name ?? '',
        title: inv.title,
        invoice_date: inv.invoice_date,
        writer_pay: agg.sum,
        paid_at: inv.paid_at,
        status: settledKeys.has(settlementKey(inv.id, writer_name)) ? 'settled' : 'unsettled',
        doc_number: '', // GET에서 채번 주입
        items: agg.items,
      });
    }
  }

  return rows;
}

// 목록 행(들) → 용역 정산서(ServiceSettlement). 일괄/개인별 미리보기 공용.
// 한 행의 각 항목이 detail 한 줄이 된다(invoice 메타는 행에서, 금액은 항목에서).
export function buildSettlementFromRows(
  rows: SettlementRow[],
  writerName: string,
  periodStart: string,
  periodEnd: string,
  createdAt: string,
): ServiceSettlement {
  const detail: ServiceSettlementDetailItem[] = rows.flatMap((r) =>
    r.items.map((it) => ({
      invoice_id: r.invoice_id,
      invoice_date: r.invoice_date,
      paid_at: r.paid_at,
      client_name: r.client_name,
      title: r.title,
      description: it.description,
      writer_pay: it.writer_pay,
      supply: it.supply,
      attribution: it.attribution,
    })),
  );
  const total = detail.reduce((sum, d) => sum + d.writer_pay, 0);
  return {
    id: '',
    writer_name: writerName,
    period_start: periodStart,
    period_end: periodEnd,
    total_amount: total,
    detail,
    created_at: createdAt,
  };
}
