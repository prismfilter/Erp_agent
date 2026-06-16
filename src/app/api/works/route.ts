// 저작물 DB 목록 / 등록
// 조회: ADMIN/STAFF · 등록: ADMIN only (API에서 강제)

import { NextRequest, NextResponse } from 'next/server';
import { requireStaff, isErrorResponse } from '@/lib/auth/apiAuth';
import { parseBody } from '@/lib/validation/parse';
import { musicWorkCreateSchema } from '@/lib/validation/schemas';

const SELECT = 'id, no, writer_name, komca_code, song_title, artist, domestic_share, overseas_share, rate, recontract_date, created_at';

// GET /api/works — 작가 필터(writer) 또는 전체보기(offset/limit) 목록
export async function GET(request: NextRequest) {
  try {
    const auth = await requireStaff();
    if (isErrorResponse(auth)) return auth;

    const { searchParams } = new URL(request.url);
    const writer = searchParams.get('writer');

    // 특정 작가: 해당 작가의 전 행 (소량)
    if (writer) {
      const { data, error } = await auth.adminClient
        .from('music_works')
        .select(SELECT)
        .eq('writer_name', writer)
        .order('no', { ascending: true });
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ works: data, total: data?.length ?? 0 });
    }

    // 전체보기: offset/limit 페이지네이션 + 총 건수
    const offset = Math.max(0, Number(searchParams.get('offset') ?? '0') || 0);
    const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') ?? '20') || 20));
    const { data, error, count } = await auth.adminClient
      .from('music_works')
      .select(SELECT, { count: 'exact' })
      .order('no', { ascending: true })
      .range(offset, offset + limit - 1);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ works: data, total: count ?? 0 });
  } catch (err) {
    console.error('저작물 목록 API 오류:', err);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

// POST /api/works — 저작물 등록 (ADMIN only)
export async function POST(request: NextRequest) {
  try {
    const auth = await requireStaff(true);
    if (isErrorResponse(auth)) return auth;

    const parsed = parseBody(musicWorkCreateSchema, await request.json());
    if (!parsed.success) return parsed.response;

    const { data, error } = await auth.adminClient
      .from('music_works')
      .insert(parsed.data)
      .select(SELECT)
      .single();

    if (error) {
      // UNIQUE(no) 위반 — 중복 NO. 입력 차단
      if (error.code === '23505') {
        return NextResponse.json({ error: '이미 존재하는 NO입니다.' }, { status: 409 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ work: data }, { status: 201 });
  } catch (err) {
    console.error('저작물 등록 API 오류:', err);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
