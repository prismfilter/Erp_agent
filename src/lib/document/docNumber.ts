// 문서번호 채번 — 거래처 청구서/내부 지급서('invoice')·용역 정산서('settlement').
// 형식 YYYY-NNN호. 엔티티당 1번호(멱등, 영구 고정). 타입·연도 내 seq 고유, 교차 타입 중복 허용.
// 단일 관리자 환경 가정 — UNIQUE 제약 + 재read로 드문 경합도 방어.

import type { SupabaseClient } from '@supabase/supabase-js';
import { settlementKey } from '@/lib/settlement/serviceRows';

export const DOC_TYPE_INVOICE = 'invoice';
export const DOC_TYPE_SETTLEMENT = 'settlement';

// seq → 'YYYY-NNN' (호 미표기)
export function formatDocNumber(year: number, seq: number): string {
  return `${year}-${String(seq).padStart(3, '0')}`;
}

// 한 엔티티의 기존 번호 조회 (없으면 null)
async function lookupSeq(
  client: SupabaseClient,
  docType: string,
  entityKey: string,
): Promise<number | null> {
  const { data } = await client
    .from('document_numbers')
    .select('seq')
    .eq('doc_type', docType)
    .eq('entity_key', entityKey)
    .maybeSingle();
  return data ? (data.seq as number) : null;
}

// 단건 채번 — 기존 있으면 재사용(멱등), 없으면 (타입,연도) 다음 seq 부여.
export async function assignDocNumber(
  client: SupabaseClient,
  docType: string,
  year: number,
  entityKey: string,
): Promise<string | null> {
  const existing = await lookupSeq(client, docType, entityKey);
  if (existing != null) return formatDocNumber(year, existing);

  for (let attempt = 0; attempt < 6; attempt++) {
    const { data: maxRow } = await client
      .from('document_numbers')
      .select('seq')
      .eq('doc_type', docType)
      .eq('doc_year', year)
      .order('seq', { ascending: false })
      .limit(1)
      .maybeSingle();
    const next = ((maxRow?.seq as number | undefined) ?? 0) + 1;

    const { error } = await client
      .from('document_numbers')
      .insert({ doc_type: docType, doc_year: year, seq: next, entity_key: entityKey });
    if (!error) return formatDocNumber(year, next);

    // 충돌 — 엔티티 키 충돌이면 다른 곳에서 부여된 것이라 재read, seq 충돌이면 재시도
    const again = await lookupSeq(client, docType, entityKey);
    if (again != null) return formatDocNumber(year, again);
  }
  return null;
}

// 용역 정산 행 배치 채번 — 입금완료일(asc) 순으로 작은 번호 부여. 반환: settlementKey → 'YYYY-NNN호'
export async function assignSettlementNumbers(
  client: SupabaseClient,
  rows: { invoice_id: string; writer_name: string; paid_at: string | null }[],
): Promise<Map<string, string>> {
  // 기존 settlement 번호 일괄 조회
  const { data: existing } = await client
    .from('document_numbers')
    .select('entity_key, doc_year, seq')
    .eq('doc_type', DOC_TYPE_SETTLEMENT);

  const assigned = new Map<string, { year: number; seq: number }>();
  const maxByYear = new Map<number, number>();
  for (const e of existing ?? []) {
    const year = e.doc_year as number;
    const seq = e.seq as number;
    assigned.set(e.entity_key as string, { year, seq });
    maxByYear.set(year, Math.max(maxByYear.get(year) ?? 0, seq));
  }

  // 미할당 행(paid_at 있는 것)만 입금완료일 오름차순으로 순차 부여
  const toAssign = rows
    .filter((r) => r.paid_at && !assigned.has(settlementKey(r.invoice_id, r.writer_name)))
    .sort((a, b) => (a.paid_at as string).localeCompare(b.paid_at as string));

  for (const r of toAssign) {
    const key = settlementKey(r.invoice_id, r.writer_name);
    const year = parseInt((r.paid_at as string).slice(0, 4), 10);
    const next = (maxByYear.get(year) ?? 0) + 1;

    const { error } = await client
      .from('document_numbers')
      .insert({ doc_type: DOC_TYPE_SETTLEMENT, doc_year: year, seq: next, entity_key: key });
    if (!error) {
      assigned.set(key, { year, seq: next });
      maxByYear.set(year, next);
    } else {
      // 경합 — 이미 부여됐을 수 있으니 재read
      const got = await lookupSeq(client, DOC_TYPE_SETTLEMENT, key);
      if (got != null) {
        assigned.set(key, { year, seq: got });
        maxByYear.set(year, Math.max(maxByYear.get(year) ?? 0, got));
      }
    }
  }

  const result = new Map<string, string>();
  for (const r of rows) {
    const key = settlementKey(r.invoice_id, r.writer_name);
    const e = assigned.get(key);
    if (e) result.set(key, formatDocNumber(e.year, e.seq));
  }
  return result;
}
