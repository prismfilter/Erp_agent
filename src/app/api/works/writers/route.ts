// 저작물 DB — 자사작가별 참여 작품수 (좌측 작가 패널용) + 전체 작품수(total)
// 자사작가 = writers.original_writer_code(KOMCA 원작자코드)가 설정된 작가.
// 해당 코드가 work_authors.author_code로 등장하는 작품을 그 작가의 작업물로 집계.
// 조회: ADMIN/STAFF

import { NextResponse } from 'next/server';
import { requireStaff, isErrorResponse } from '@/lib/auth/apiAuth';
import type { WorkWriterGroup } from '@/types/invoice';

// GET /api/works/writers — { writers: [{writer_name, count}], total }
export async function GET() {
  try {
    const auth = await requireStaff();
    if (isErrorResponse(auth)) return auth;

    // 자사작가(원작자코드 보유) + 원작자 매칭 데이터 + 전체 작품수 동시 조회
    const [writersRes, authorsRes, totalRes] = await Promise.all([
      auth.adminClient
        .from('writers')
        .select('name, original_writer_code')
        .not('original_writer_code', 'is', null),
      auth.adminClient.from('work_authors').select('author_code, work_id'),
      auth.adminClient.from('works').select('id', { count: 'exact', head: true }),
    ]);

    if (writersRes.error) return NextResponse.json({ error: writersRes.error.message }, { status: 500 });
    if (authorsRes.error) return NextResponse.json({ error: authorsRes.error.message }, { status: 500 });

    // 원작자코드 → 참여 작품 id 집합 (작품당 중복 제거)
    const worksByCode = new Map<string, Set<string>>();
    for (const row of (authorsRes.data ?? []) as { author_code: string | null; work_id: string }[]) {
      if (!row.author_code) continue;
      if (!worksByCode.has(row.author_code)) worksByCode.set(row.author_code, new Set());
      worksByCode.get(row.author_code)!.add(row.work_id);
    }

    const writers: WorkWriterGroup[] = ((writersRes.data ?? []) as { name: string; original_writer_code: string }[])
      .map((w) => ({ writer_name: w.name, count: worksByCode.get(w.original_writer_code)?.size ?? 0 }))
      .filter((g) => g.count > 0)
      .sort((a, b) => a.writer_name.localeCompare(b.writer_name, 'ko'));

    return NextResponse.json({ writers, total: totalRes.count ?? 0 });
  } catch (err) {
    console.error('저작물 작가 목록 API 오류:', err);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
