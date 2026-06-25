// 청구서 작업자 요약 — 내부 표시 항목의 작업자 이름을 중복 제거해 축약
import type { InvoiceItem } from '@/types/invoice';
import { getInternalItems } from '@/lib/invoice/calculator';

/**
 * 내부 표시 항목에서 작업자 이름을 중복 제거하여 요약한다.
 * 최대 3명까지 나열하고 그 이상은 "외 N명" 으로 축약한다.
 */
export function writerSummary(items: InvoiceItem[]): string {
  const names = new Set<string>();
  getInternalItems(items).forEach((it) => {
    it.writer_names.split(',').map((n) => n.trim()).filter(Boolean).forEach((n) => names.add(n));
  });
  const arr = Array.from(names);
  if (arr.length === 0) return '-';
  if (arr.length <= 3) return arr.join(', ');
  return `${arr.slice(0, 3).join(', ')} 외 ${arr.length - 3}명`;
}
