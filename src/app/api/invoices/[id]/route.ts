// 청구서 상세 조회 / 수정 / 삭제

import { NextRequest, NextResponse } from 'next/server';
import { requireStaff, isErrorResponse } from '@/lib/auth/apiAuth';
import { serverError, dbError } from '@/lib/api/respond';
import { insertItems } from '@/lib/invoice/itemsRepo';
import { parseBody, readJson } from '@/lib/validation/parse';
import { invoiceUpdateSchema } from '@/lib/validation/schemas';

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
      return dbError('청구서 상세 API 오류', error);
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
    return serverError('청구서 상세 API 오류', err);
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
    const body = await readJson(request);
    if (!body.success) return body.response;
    const parsed = parseBody(invoiceUpdateSchema, body.data);
    if (!parsed.success) return parsed.response;
    const { invoice_date, client_id, title, account_id, status, memo, items } = parsed.data;

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (invoice_date !== undefined) updates.invoice_date = invoice_date;
    if (client_id !== undefined) updates.client_id = client_id || null;
    if (title !== undefined) updates.title = title;
    if (account_id !== undefined) updates.account_id = account_id || null;
    if (status !== undefined) {
      updates.status = status;
      // 입금 완료 시점 기록 — 용역 정산 기간 매칭의 기준. paid 외 상태로 되돌리면 해제.
      updates.paid_at = status === 'paid' ? new Date().toISOString() : null;
    }
    if (memo !== undefined) updates.memo = memo || null;

    const { error: upErr } = await auth.adminClient
      .from('invoices')
      .update(updates)
      .eq('id', id);

    if (upErr) {
      return dbError('청구서 수정 API 오류', upErr);
    }

    // items가 전달되면 전체 교체 (delete-and-insert)
    if (Array.isArray(items)) {
      const { error: delErr } = await auth.adminClient
        .from('invoice_items')
        .delete()
        .eq('invoice_id', id);
      if (delErr) {
        return dbError('청구서 수정 API 오류', delErr);
      }

      const insertErr = await insertItems(auth.adminClient, id, items);
      if (insertErr) {
        return NextResponse.json({ error: insertErr }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return serverError('청구서 수정 API 오류', err);
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
      return dbError('청구서 삭제 API 오류', error);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return serverError('청구서 삭제 API 오류', err);
  }
}
