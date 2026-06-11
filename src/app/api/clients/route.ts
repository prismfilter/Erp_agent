// 거래처 목록(자동완성용) / 즉시 추가

import { NextRequest, NextResponse } from 'next/server';
import { requireStaff, isErrorResponse } from '@/lib/invoice/apiAuth';

export async function GET() {
  try {
    const auth = await requireStaff();
    if (isErrorResponse(auth)) return auth;

    const { data, error } = await auth.adminClient
      .from('clients')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ clients: data });
  } catch (err) {
    console.error('거래처 API 오류:', err);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

// POST /api/clients — 신규 거래처 즉시 추가 (이미 있으면 기존 반환)
export async function POST(request: NextRequest) {
  try {
    const auth = await requireStaff();
    if (isErrorResponse(auth)) return auth;

    const { name } = await request.json();
    if (!name?.trim()) {
      return NextResponse.json({ error: '거래처명은 필수입니다.' }, { status: 400 });
    }

    // 동일 이름 존재 시 기존 거래처 반환
    const { data: existing } = await auth.adminClient
      .from('clients')
      .select('*')
      .eq('name', name.trim())
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ client: existing });
    }

    const { data, error } = await auth.adminClient
      .from('clients')
      .insert({ name: name.trim() })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ client: data }, { status: 201 });
  } catch (err) {
    console.error('거래처 추가 API 오류:', err);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
