// 프라이스 테이블 목록 / 추가

import { NextRequest, NextResponse } from 'next/server';
import { requireStaff, isErrorResponse } from '@/lib/invoice/apiAuth';

// GET /api/price-items?all=1 (all=1이면 비활성 포함 — 관리 페이지용)
export async function GET(request: NextRequest) {
  try {
    const auth = await requireStaff();
    if (isErrorResponse(auth)) return auth;

    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get('all') === '1';

    let query = auth.adminClient
      .from('price_items')
      .select('*')
      .order('category')
      .order('sort_order');

    if (!includeInactive) query = query.eq('is_active', true);

    const { data, error } = await query;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ priceItems: data });
  } catch (err) {
    console.error('프라이스 테이블 API 오류:', err);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

// POST /api/price-items — 항목 추가 (ADMIN only)
export async function POST(request: NextRequest) {
  try {
    const auth = await requireStaff(true);
    if (isErrorResponse(auth)) return auth;

    const body = await request.json();
    const { category, name, billing_price, writer_base_pay, fee_rate, is_formula, formula_note, sort_order } = body;

    if (!category || !name) {
      return NextResponse.json({ error: '카테고리와 작업내역명은 필수입니다.' }, { status: 400 });
    }

    const { data, error } = await auth.adminClient
      .from('price_items')
      .insert({
        category,
        name,
        billing_price: billing_price ?? null,
        writer_base_pay: writer_base_pay ?? null,
        fee_rate: fee_rate ?? 0.2,
        is_formula: is_formula ?? false,
        formula_note: formula_note ?? null,
        sort_order: sort_order ?? 999,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ priceItem: data }, { status: 201 });
  } catch (err) {
    console.error('프라이스 테이블 추가 API 오류:', err);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
