// 청구서 상세 조회 / 수정 / 삭제

import { NextRequest, NextResponse } from 'next/server';
import { requireStaff, isErrorResponse } from '@/lib/invoice/apiAuth';
import { insertItems } from '@/lib/invoice/itemsRepo';

// GET /api/invoices/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireStaff();
    if (isErrorResponse(auth)) return auth;

    const { id } = await params;
    const { data, error } = await auth.adminClient
      .from('invoices')
      .select('*, client:clients(*), account:company_accounts(*), items:invoice_items(*)')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json({ error: '청구서를 찾을 수 없습니다.' }, { status: 404 });
    }

    // items를 no 순으로 정렬
    if (data.items) {
      data.items.sort((a: { no: number }, b: { no: number }) => a.no - b.no);
    }

    return NextResponse.json({ invoice: data });
  } catch (err) {
    console.error('청구서 상세 API 오류:', err);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

// PATCH /api/invoices/[id] — 헤더 수정 + items 전체 교체
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireStaff();
    if (isErrorResponse(auth)) return auth;

    const { id } = await params;
    const body = await request.json();
    const { invoice_date, client_id, title, account_id, status, memo, items } = body;

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (invoice_date !== undefined) updates.invoice_date = invoice_date;
    if (client_id !== undefined) updates.client_id = client_id || null;
    if (title !== undefined) updates.title = title;
    if (account_id !== undefined) updates.account_id = account_id || null;
    if (status !== undefined) updates.status = status;
    if (memo !== undefined) updates.memo = memo || null;

    const { error: upErr } = await auth.adminClient
      .from('invoices')
      .update(updates)
      .eq('id', id);

    if (upErr) {
      return NextResponse.json({ error: upErr.message }, { status: 500 });
    }

    // items가 전달되면 전체 교체 (delete-and-insert)
    if (Array.isArray(items)) {
      const { error: delErr } = await auth.adminClient
        .from('invoice_items')
        .delete()
        .eq('invoice_id', id);
      if (delErr) {
        return NextResponse.json({ error: delErr.message }, { status: 500 });
      }

      const insertErr = await insertItems(auth.adminClient, id, items);
      if (insertErr) {
        return NextResponse.json({ error: insertErr }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('청구서 수정 API 오류:', err);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

// DELETE /api/invoices/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireStaff();
    if (isErrorResponse(auth)) return auth;

    const { id } = await params;
    const { error } = await auth.adminClient
      .from('invoices')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('청구서 삭제 API 오류:', err);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
