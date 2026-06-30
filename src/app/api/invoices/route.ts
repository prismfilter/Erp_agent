// 청구서 목록 조회 + 생성

import { NextRequest, NextResponse } from 'next/server';
import { requireStaff, isErrorResponse } from '@/lib/auth/apiAuth';
import { serverError, dbError } from '@/lib/api/respond';
import { insertItems } from '@/lib/invoice/itemsRepo';
import { parseBody, readJson } from '@/lib/validation/parse';
import { invoiceCreateSchema } from '@/lib/validation/schemas';

// GET /api/invoices?client_id=&status=&from=&to=&q=
export async function GET(request: NextRequest) {
  try {
    const auth = await requireStaff();
    if (isErrorResponse(auth)) return auth;

    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('client_id');
    const status = searchParams.get('status');
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const q = searchParams.get('q');

    let query = auth.adminClient
      .from('invoices')
      .select('*, client:clients(*), account:company_accounts(*), items:invoice_items(*)')
      .order('invoice_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (clientId) query = query.eq('client_id', clientId);
    if (status) query = query.eq('status', status);
    if (from) query = query.gte('invoice_date', from);
    if (to) query = query.lte('invoice_date', to);
    if (q) query = query.ilike('title', `%${q}%`);

    const { data, error } = await query;
    if (error) {
      return dbError('청구서 목록 API 오류', error);
    }

    return NextResponse.json({ invoices: data });
  } catch (err) {
    return serverError('청구서 목록 API 오류', err);
  }
}

// POST /api/invoices — 헤더 + items 일괄 생성
export async function POST(request: NextRequest) {
  try {
    const auth = await requireStaff();
    if (isErrorResponse(auth)) return auth;

    const body = await readJson(request);
    if (!body.success) return body.response;
    const parsed = parseBody(invoiceCreateSchema, body.data);
    if (!parsed.success) return parsed.response;
    const { invoice_date, client_id, title, account_id, status, memo, items } = parsed.data;

    const { data: invoice, error: invErr } = await auth.adminClient
      .from('invoices')
      .insert({
        invoice_date,
        client_id: client_id || null,
        title,
        account_id: account_id || null,
        status: status || 'draft',
        memo: memo || null,
        created_by: auth.userId,
      })
      .select()
      .single();

    if (invErr || !invoice) {
      return dbError('청구서 생성 API 오류', invErr);
    }

    if (Array.isArray(items) && items.length > 0) {
      const insertErr = await insertItems(auth.adminClient, invoice.id, items);
      if (insertErr) {
        return NextResponse.json({ error: insertErr }, { status: 500 });
      }
    }

    return NextResponse.json({ invoice }, { status: 201 });
  } catch (err) {
    return serverError('청구서 생성 API 오류', err);
  }
}
