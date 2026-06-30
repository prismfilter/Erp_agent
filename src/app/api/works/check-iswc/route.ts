// ISWC 중복 확인 — 등록/수정 폼의 인라인 경고용
// 조회: ADMIN/STAFF. ISWC는 중복이어도 차단하지 않고 경고만 표시(동일 곡 중복 발매 가능).

import { NextRequest, NextResponse } from 'next/server';
import { requireStaff, isErrorResponse } from '@/lib/auth/apiAuth';
import { serverError, dbError } from '@/lib/api/respond';

// GET /api/works/check-iswc?iswc=...&excludeId=... → { duplicate, work? }
export async function GET(request: NextRequest) {
  try {
    const auth = await requireStaff();
    if (isErrorResponse(auth)) return auth;

    const { searchParams } = new URL(request.url);
    const iswc = (searchParams.get('iswc') ?? '').trim();
    const excludeId = searchParams.get('excludeId');
    if (!iswc) return NextResponse.json({ duplicate: false });

    let query = auth.adminClient.from('works').select('id, no, song_title').eq('iswc', iswc);
    if (excludeId) query = query.neq('id', excludeId);
    const { data, error } = await query.limit(1).maybeSingle();
    if (error) return dbError('ISWC 중복확인 API 오류', error);

    return NextResponse.json({
      duplicate: !!data,
      work: data ? { no: data.no, song_title: data.song_title } : null,
    });
  } catch (err) {
    return serverError('ISWC 중복확인 API 오류', err);
  }
}
