// 청구서 복제 — 동일 헤더 + items를 새 draft로 생성

import { NextRequest, NextResponse } from 'next/server';
import { requireStaff, isErrorResponse } from '@/lib/auth/apiAuth';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireStaff();
    if (isErrorResponse(auth)) return auth;

    const { id } = await params;

    // 원본 조회
    const { data: src, error: srcErr } = await auth.adminClient
      .from('invoices')
      .select('*, items:invoice_items(*)')
      .eq('id', id)
      .maybeSingle();

    if (srcErr || !src) {
      return NextResponse.json({ error: '원본 청구서를 찾을 수 없습니다.' }, { status: 404 });
    }

    // 새 청구서 생성 (draft, 거래명에 "복사본" 표기)
    const { data: copy, error: copyErr } = await auth.adminClient
      .from('invoices')
      .insert({
        invoice_date: new Date().toISOString().slice(0, 10),
        client_id: src.client_id,
        title: `${src.title} (복사본)`,
        account_id: src.account_id,
        status: 'draft',
        memo: src.memo,
        created_by: auth.userId,
      })
      .select()
      .single();

    if (copyErr || !copy) {
      return NextResponse.json({ error: copyErr?.message || '복제 실패' }, { status: 500 });
    }

    // items 복제 — 부모 행 먼저, group_key 매핑 유지
    interface SrcItem {
      id: string; no: number; price_item_id: string | null; description: string;
      writer_names: string; supply_amount: number; writer_pay: number;
      item_type: string; is_negotiated: boolean; note: string | null;
      show_in_external: boolean; group_key: string | null;
    }
    const srcItems: SrcItem[] = (src.items || []).sort((a: SrcItem, b: SrcItem) => a.no - b.no);
    const oldToNewId = new Map<string, string>();

    for (const it of srcItems.filter((i) => !i.group_key)) {
      const { data: newItem, error } = await auth.adminClient
        .from('invoice_items')
        .insert({
          invoice_id: copy.id,
          no: it.no,
          price_item_id: it.price_item_id,
          description: it.description,
          writer_names: it.writer_names,
          supply_amount: it.supply_amount,
          writer_pay: it.writer_pay,
          item_type: it.item_type,
          is_negotiated: it.is_negotiated,
          note: it.note,
          show_in_external: it.show_in_external,
          group_key: null,
        })
        .select('id')
        .single();
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      oldToNewId.set(it.id, newItem.id);
    }

    for (const it of srcItems.filter((i) => i.group_key)) {
      const { error } = await auth.adminClient
        .from('invoice_items')
        .insert({
          invoice_id: copy.id,
          no: it.no,
          price_item_id: it.price_item_id,
          description: it.description,
          writer_names: it.writer_names,
          supply_amount: it.supply_amount,
          writer_pay: it.writer_pay,
          item_type: it.item_type,
          is_negotiated: it.is_negotiated,
          note: it.note,
          show_in_external: it.show_in_external,
          group_key: oldToNewId.get(it.group_key!) ?? null,
        });
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }

    return NextResponse.json({ invoice: copy }, { status: 201 });
  } catch (err) {
    console.error('청구서 복제 API 오류:', err);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
