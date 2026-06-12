// 청구서 라인 항목 저장 헬퍼
// 클라이언트가 보낸 임시 group_key를 실제 uuid로 매핑하며 일괄 삽입

import type { SupabaseClient } from '@supabase/supabase-js';
import type { InvoiceItemInput } from '@/lib/validation/schemas';
import { calcItemBreakdown } from '@/lib/invoice/calculator';

export async function insertItems(
  adminClient: SupabaseClient,
  invoiceId: string,
  items: InvoiceItemInput[]
): Promise<string | null> {
  // 1차: 부모 행(group_key 없음) 삽입
  const parents = items.filter((it) => !it.group_key);
  const children = items.filter((it) => it.group_key);

  const tmpKeyToRealId = new Map<string, string>();

  for (const it of parents) {
    const { data, error } = await adminClient
      .from('invoice_items')
      .insert(buildItemRow(invoiceId, it, null))
      .select('id')
      .single();
    if (error) return error.message;
    // 클라이언트가 보낸 임시 키(id 필드)로 매핑 저장
    if (it.id) tmpKeyToRealId.set(it.id, data.id);
  }

  // 2차: 자식 행 — group_key를 부모 실제 id로 치환
  for (const it of children) {
    const realParentId = tmpKeyToRealId.get(it.group_key!) ?? it.group_key ?? null;
    const { error } = await adminClient
      .from('invoice_items')
      .insert(buildItemRow(invoiceId, it, realParentId));
    if (error) return error.message;
  }

  return null;
}

function buildItemRow(invoiceId: string, it: InvoiceItemInput, groupKey: string | null) {
  const supply_amount = it.supply_amount || 0;
  const discount_amount = it.discount_amount || 0;
  const writer_pay_rate = it.writer_pay_rate ?? 70;
  // 작가지급액은 비율로부터 재계산해 저장 (엑셀 SUM·매출 집계 호환)
  const { writerPay } = calcItemBreakdown({ supply_amount, discount_amount, writer_pay_rate });
  return {
    invoice_id: invoiceId,
    no: it.no,
    price_item_id: it.price_item_id || null,
    description: it.description || '',
    writer_names: it.writer_names || '',
    supply_amount,
    discount_amount,
    writer_pay_rate,
    writer_pay: writerPay,
    item_type: it.item_type || 'normal',
    is_negotiated: it.is_negotiated || false,
    note: it.note || null,
    show_in_external: it.show_in_external !== false,
    group_key: groupKey,
  };
}
