// 작가 마스터 목록 / 등록 (로그인 계정과 무관한 작가/작업자 레지스트리)

import { NextRequest, NextResponse } from 'next/server';
import { requireStaff, isErrorResponse } from '@/lib/auth/apiAuth';
import { parseBody } from '@/lib/validation/parse';
import { writerCreateSchema } from '@/lib/validation/schemas';

// GET /api/writers — 목록 (ADMIN/STAFF 조회)
export async function GET() {
  try {
    const auth = await requireStaff();
    if (isErrorResponse(auth)) return auth;

    const { data, error } = await auth.adminClient
      .from('writers')
      .select('id, name, writer_type, fee_rate, permanent_rate, general_rate, recontract_date, status, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ writers: data });
  } catch (err) {
    console.error('작가 마스터 목록 API 오류:', err);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

// POST /api/writers — 작가 등록 (ADMIN only)
export async function POST(request: NextRequest) {
  try {
    const auth = await requireStaff(true);
    if (isErrorResponse(auth)) return auth;

    const parsed = parseBody(writerCreateSchema, await request.json());
    if (!parsed.success) return parsed.response;
    const { name, writer_type, fee_rate, permanent_rate, general_rate, recontract_date } = parsed.data;

    const { data, error } = await auth.adminClient
      .from('writers')
      .insert({
        name,
        writer_type,
        fee_rate,
        permanent_rate: permanent_rate ?? null,
        general_rate: general_rate ?? null,
        recontract_date: recontract_date ?? null,
      })
      .select('id, name, writer_type, fee_rate, permanent_rate, general_rate, recontract_date, status, created_at')
      .single();

    if (error) {
      // UNIQUE(name) 위반
      if (error.code === '23505') {
        return NextResponse.json({ error: '이미 등록된 작가명입니다.' }, { status: 409 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ writer: data }, { status: 201 });
  } catch (err) {
    console.error('작가 마스터 등록 API 오류:', err);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
