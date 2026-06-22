// 거래처 목록(자동완성용) / 즉시 추가

import { NextRequest, NextResponse } from 'next/server';
import { requireStaff, isErrorResponse } from '@/lib/auth/apiAuth';
import { parseBody } from '@/lib/validation/parse';
import { clientCreateSchema } from '@/lib/validation/schemas';
import { nextClientCode } from '@/lib/clients/clientCode';

// 응답·조회 공통 컬럼(거래처 코드 포함)
const CLIENT_SELECT = 'id, client_code, name, is_active, created_at';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireStaff();
    if (isErrorResponse(auth)) return auth;

    // ?all=1 → 비활성 포함 전체(관리 페이지용). 기본은 활성만(자동완성용).
    const all = new URL(request.url).searchParams.get('all') === '1';
    let query = auth.adminClient
      .from('clients')
      .select(CLIENT_SELECT)
      .order('name');
    if (!all) query = query.eq('is_active', true);

    const { data, error } = await query;
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

    const parsed = parseBody(clientCreateSchema, await request.json());
    if (!parsed.success) return parsed.response;
    const name = parsed.data.name; // 스키마에서 trim 적용됨

    // 동일 이름 존재 시 기존 거래처 반환
    const { data: existing } = await auth.adminClient
      .from('clients')
      .select('*')
      .eq('name', name)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ client: existing });
    }

    // 거래처 코드(CL-NNN)는 서버가 자동 부여. 동시 등록 충돌 대비 1회 재시도(UNIQUE가 최종 방어선).
    let lastMessage = '거래처 코드 생성에 실패했습니다.';
    for (let attempt = 0; attempt < 2; attempt++) {
      const { data: rows } = await auth.adminClient.from('clients').select('client_code');
      const codes = (rows ?? [])
        .map((r) => r.client_code as string | null)
        .filter((c): c is string => !!c);
      const client_code = nextClientCode(codes);

      const { data, error } = await auth.adminClient
        .from('clients')
        .insert({ client_code, name })
        .select(CLIENT_SELECT)
        .single();

      if (!error) return NextResponse.json({ client: data }, { status: 201 });

      if (error.code === '23505' && error.message.includes('client_code')) {
        lastMessage = error.message;
        continue; // 코드 충돌 → 재계산 재시도
      }
      if (error.code === '23505') {
        return NextResponse.json({ error: '이미 등록된 거래처명입니다.' }, { status: 409 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ error: lastMessage }, { status: 500 });
  } catch (err) {
    console.error('거래처 추가 API 오류:', err);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
