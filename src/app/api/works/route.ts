// 저작물 DB 목록 / 등록 (works + 원작자 다건)
// 조회: ADMIN/STAFF · 등록: ADMIN only (API에서 강제)

import { NextRequest, NextResponse } from 'next/server';
import { requireStaff, isErrorResponse } from '@/lib/auth/apiAuth';
import { serverError, dbError } from '@/lib/api/respond';
import { parseBody, readJson } from '@/lib/validation/parse';
import { workCreateSchema } from '@/lib/validation/schemas';

// 목록은 작품(works) 컬럼만 — 원작자는 상세에서 조회
const SELECT = 'id, no, komca_code, song_title, song_title_en, artist, artist_en, publish_date, iswc, created_at';

// GET /api/works — 자사작가 필터(writer=실명) 또는 전체보기(offset/limit)
export async function GET(request: NextRequest) {
  try {
    const auth = await requireStaff();
    if (isErrorResponse(auth)) return auth;

    const { searchParams } = new URL(request.url);
    const writer = searchParams.get('writer');

    // 특정 자사작가: 실명 → 원작자코드(original_writer_code) → 해당 코드가 원작자에 포함된 작품
    if (writer) {
      const { data: w } = await auth.adminClient
        .from('writers')
        .select('original_writer_code')
        .eq('name', writer)
        .maybeSingle();
      const code = w?.original_writer_code;
      if (!code) return NextResponse.json({ works: [], total: 0 });

      // 1) 해당 원작자코드가 등장하는 작품 id 수집(작품당 중복 제거)
      const { data: waRows, error: waErr } = await auth.adminClient
        .from('work_authors')
        .select('work_id')
        .eq('author_code', code);
      if (waErr) return dbError('저작물 목록 API 오류', waErr);
      const ids = [...new Set((waRows ?? []).map((r) => r.work_id))];
      if (ids.length === 0) return NextResponse.json({ works: [], total: 0 });

      // 2) 작품 조회
      const { data, error } = await auth.adminClient
        .from('works')
        .select(SELECT)
        .in('id', ids)
        .order('no', { ascending: true });
      if (error) return dbError('저작물 목록 API 오류', error);
      return NextResponse.json({ works: data, total: data?.length ?? 0 });
    }

    // 전체보기: offset/limit 페이지네이션 + 총 건수
    const offset = Math.max(0, Number(searchParams.get('offset') ?? '0') || 0);
    const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') ?? '20') || 20));
    const { data, error, count } = await auth.adminClient
      .from('works')
      .select(SELECT, { count: 'exact' })
      .order('no', { ascending: true })
      .range(offset, offset + limit - 1);
    if (error) return dbError('저작물 목록 API 오류', error);
    return NextResponse.json({ works: data, total: count ?? 0 });
  } catch (err) {
    return serverError('저작물 목록 API 오류', err);
  }
}

// POST /api/works — 저작물 등록 (작품 + 원작자 목록, ADMIN only)
export async function POST(request: NextRequest) {
  try {
    const auth = await requireStaff(true);
    if (isErrorResponse(auth)) return auth;

    const body = await readJson(request);
    if (!body.success) return body.response;
    const parsed = parseBody(workCreateSchema, body.data);
    if (!parsed.success) return parsed.response;

    const { authors, ...workFields } = parsed.data;

    // 0) 중복 검사 — 저작물코드는 차단, ISWC는 경고만(동일 곡 중복 발매 시 ISWC 중복 가능)
    if (workFields.komca_code) {
      const { data: dup } = await auth.adminClient
        .from('works').select('id').eq('komca_code', workFields.komca_code).limit(1).maybeSingle();
      if (dup) return NextResponse.json({ error: '이미 존재하는 저작물코드입니다.' }, { status: 409 });
    }
    let warning: string | undefined;
    if (workFields.iswc) {
      const { data: dup } = await auth.adminClient
        .from('works').select('id').eq('iswc', workFields.iswc).limit(1).maybeSingle();
      if (dup) warning = '이미 사용된 ISWC입니다. 동일 곡 중복 발매면 정상일 수 있습니다.';
    }

    // 1) 작품 삽입
    const { data: work, error } = await auth.adminClient
      .from('works')
      .insert(workFields)
      .select('id')
      .single();
    if (error) {
      // UNIQUE(no) 위반 (저작물코드는 위에서 사전 검사)
      if (error.code === '23505') {
        return NextResponse.json({ error: '이미 존재하는 NO.입니다.' }, { status: 409 });
      }
      return dbError('저작물 등록 API 오류', error);
    }

    // 2) 원작자 삽입 (실패 시 작품 롤백)
    const rows = authors.filter((a) => a.author_name || a.author_code).map((a) => ({ ...a, work_id: work.id }));
    if (rows.length > 0) {
      const { error: aErr } = await auth.adminClient.from('work_authors').insert(rows);
      if (aErr) {
        await auth.adminClient.from('works').delete().eq('id', work.id);
        return dbError('저작물 등록 API 오류', aErr);
      }
    }

    return NextResponse.json({ id: work.id, warning }, { status: 201 });
  } catch (err) {
    return serverError('저작물 등록 API 오류', err);
  }
}
