// 저작물 DB 상세 조회 / 삭제
// 조회: ADMIN/STAFF · 삭제: ADMIN only (API에서 강제)

import { NextRequest, NextResponse } from 'next/server';
import { requireStaff, isErrorResponse } from '@/lib/auth/apiAuth';

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
