// 홈 피드 순위 위젯용 순수 헬퍼
// - 작가별 정산 순위: 용역정산 total_amount(작가지급액)를 작가별 합산
// - 거래처별 매출 순위: paid 청구서 귀속금액(내부항목 기준)을 거래처별 합산
import type { Invoice } from '@/types/invoice';
import type { SettlementRow } from '@/lib/settlement/serviceRows';
import { getInternalItems, calcItemBreakdown } from '@/lib/invoice/calculator';

export interface RankingItem {
  name: string;
  amount: number;
}

// 작가별 올해 정산 순위 — paid_at 연도가 year인 용역정산 행의 writer_pay를 작가별 합산(내림차순, 0 제외)
export function buildWriterRanking(
  rows: SettlementRow[],
  year: number,
): RankingItem[] {
  const byWriter = new Map<string, number>();
  for (const r of rows) {
    if (!r.paid_at || parseInt(r.paid_at.slice(0, 4), 10) !== year) continue;
    byWriter.set(r.writer_name, (byWriter.get(r.writer_name) ?? 0) + (r.writer_pay ?? 0));
  }
  return [...byWriter.entries()]
    .map(([name, amount]) => ({ name, amount }))
    .filter((r) => r.amount > 0)
    .sort((a, b) => b.amount - a.amount);
}

// 상위 거래처 매출 순위 — invoice_date 연도가 year인 paid 청구서의 귀속금액을 거래처별 합산(내림차순)
export function buildClientRanking(paidInvoices: Invoice[], year: number): RankingItem[] {
  const byClient = new Map<string, number>();
  for (const inv of paidInvoices) {
    if (!inv.invoice_date || parseInt(inv.invoice_date.slice(0, 4), 10) !== year) continue;
    let total = 0;
    for (const it of getInternalItems(inv.items ?? [])) {
      total += calcItemBreakdown(it).attribution;
    }
    if (total === 0) continue;
    const name = inv.client?.name ?? '미지정';
    byClient.set(name, (byClient.get(name) ?? 0) + total);
  }
  return [...byClient.entries()]
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => b.amount - a.amount);
}
