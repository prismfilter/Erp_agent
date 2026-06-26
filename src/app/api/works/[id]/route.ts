// 저작물 DB 상세 조회 / 삭제
// 조회: ADMIN/STAFF · 삭제: ADMIN only (API에서 강제)

import { NextRequest, NextResponse } from 'next/server';
import { requireStaff, isErrorResponse } from '@/lib/auth/apiAuth';
import { parseBody } from '@/lib/validation/parse';
import { workCreateSchema } from '@/lib/validation/schemas';

// 작품 + 원작자 목록(공연권/복제권 포함) 중첩 조회
const DETAIL_SELECT = `
  id, no, komca_code, song_title, song_title_en, artist, artist_en, publish_date, iswc, created_at,
  authors:work_authors (
    id, role, author_code, author_name, author_name_en, performance_right, reproduction_right
  )
`;

// GET /api/works/[id] — 상세(작품 + 원작자 목록)
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireStaff();
    if (isErrorResponse(auth)) return auth;

    const { id } = await params;
    const { data, error } = await auth.adminClient
      .from('works')
      .select(DETAIL_SELECT)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: '저작물을 찾을 수 없습니다.' }, { status: 404 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ work: data });
  } catch (err) {
    console.error('저작물 상세 API 오류:', err);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

// PATCH /api/works/[id] — 작품 수정 + 원작자 목록 교체 (ADMIN only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireStaff(true);
    if (isErrorResponse(auth)) return auth;

    const { id } = await params;
    // 등록과 동일 폼(작품 전체 + 원작자 목록)을 제출받아 교체
    const parsed = parseBody(workCreateSchema, await request.json());
    if (!parsed.success) return parsed.response;

    const { authors, ...workFields } = parsed.data;

    // 1) 작품 필드 수정
    const { error: upErr } = await auth.adminClient
      .from('works')
      .update({ ...workFields, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (upErr) {
      if (upErr.code === '23505') {
        return NextResponse.json({ error: '이미 존재하는 NO. 또는 저작물코드입니다.' }, { status: 409 });
      }
      return NextResponse.json({ error: upErr.message }, { status: 500 });
    }

    // 2) 원작자 교체 — 데이터 손실 방지를 위해 (기존 조회 → 신규 삽입 성공 후 → 기존 삭제) 순서
    const { data: existing } = await auth.adminClient
      .from('work_authors')
      .select('id')
      .eq('work_id', id);
    const oldIds = (existing ?? []).map((r) => r.id);

    const rows = authors.filter((a) => a.author_name || a.author_code).map((a) => ({ ...a, work_id: id }));
    if (rows.length > 0) {
      const { error: insErr } = await auth.adminClient.from('work_authors').insert(rows);
      if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });
    }
    if (oldIds.length > 0) {
      await auth.adminClient.from('work_authors').delete().in('id', oldIds);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('저작물 수정 API 오류:', err);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

// DELETE /api/works/[id] — 영구 삭제 (원작자는 ON DELETE CASCADE)
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireStaff(true);
    if (isErrorResponse(auth)) return auth;

    const { id } = await params;
    const { error } = await auth.adminClient.from('works').delete().eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('저작물 삭제 API 오류:', err);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
