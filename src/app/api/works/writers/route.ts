// 저작물 DB — 자사작가별 참여 작품수 (좌측 작가 패널용) + 전체 작품수(total)
// 자사작가별 작품 집계는 DB RPC writer_work_counts()로 수행한다.
// work_authors가 5천행 이상이라 클라이언트 .select()는 PostgREST 1000행 상한에 걸리므로,
// DB에서 집계 후 작가별 결과(소수 행)만 반환받는다.
// 조회: ADMIN/STAFF

import { NextResponse } from 'next/server';
import { requireStaff, isErrorResponse } from '@/lib/auth/apiAuth';
import type { WorkWriterGroup } from '@/types/invoice';

// GET /api/works/writers — { writers: [{writer_name, count}], total }
export async function GET() {
  try {
    const auth = await requireStaff();
    if (isErrorResponse(auth)) return auth;

    // 자사작가별 참여 작품수는 DB 집계 함수(writer_work_counts)로 계산한다.
    // work_authors가 5천행 이상이라 클라이언트 .select()는 1000행 상한에 걸리므로,
    // 집계를 DB에서 수행하고 결과(작가별 소수 행)만 받는다. + 전체 작품수(total) 동시 조회.
    const [countsRes, totalRes] = await Promise.all([
      auth.adminClient.rpc('writer_work_counts'),
      auth.adminClient.from('works').select('id', { count: 'exact', head: true }),
    ]);

    if (countsRes.error) return NextResponse.json({ error: countsRes.error.message }, { status: 500 });

    const writers: WorkWriterGroup[] = ((countsRes.data ?? []) as { writer_name: string; count: number }[])
      .map((r) => ({ writer_name: r.writer_name, count: Number(r.count) }));

    return NextResponse.json({ writers, total: totalRes.count ?? 0 });
  } catch (err) {
    console.error('저작물 작가 목록 API 오류:', err);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
