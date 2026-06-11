// 청구서 목록 조회 + 생성

import { NextRequest, NextResponse } from 'next/server';
import { requireStaff, isErrorResponse } from '@/lib/invoice/apiAuth';
import { insertItems } from '@/lib/invoice/itemsRepo';

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
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ invoices: data });
  } catch (err) {
    console.error('청구서 목록 API 오류:', err);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

// POST /api/invoices — 헤더 + items 일괄 생성
export async function POST(request: NextRequest) {
  try {
    const auth = await requireStaff();
    if (isErrorResponse(auth)) return auth;

    const body = await request.json();
    const { invoice_date, client_id, title, account_id, status, memo, items } = body;

    if (!title || !invoice_date) {
      return NextResponse.json({ error: '날짜와 거래명은 필수입니다.' }, { status: 400 });
    }

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
      return NextResponse.json({ error: invErr?.message || '청구서 생성 실패' }, { status: 500 });
    }

    if (Array.isArray(items) && items.length > 0) {
      const insertErr = await insertItems(auth.adminClient, invoice.id, items);
      if (insertErr) {
        return NextResponse.json({ error: insertErr }, { status: 500 });
      }
    }

    return NextResponse.json({ invoice }, { status: 201 });
  } catch (err) {
    console.error('청구서 생성 API 오류:', err);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
