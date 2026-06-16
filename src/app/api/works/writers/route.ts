// 저작물 DB — 작가별 건수 목록 (좌측 작가 패널용)
// 조회: ADMIN/STAFF

import { NextResponse } from 'next/server';
import { requireStaff, isErrorResponse } from '@/lib/auth/apiAuth';
import type { WorkWriterGroup } from '@/types/invoice';

// GET /api/works/writers — 작가명별 건수 (이름순)
export async function GET() {
  try {
    const auth = await requireStaff();
    if (isErrorResponse(auth)) return auth;

    // writer_name 컬럼만 가볍게 조회 후 JS로 집계 (Supabase distinct+count 대체)
    const { data, error } = await auth.adminClient
      .from('music_works')
      .select('writer_name');

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const counts = new Map<string, number>();
    for (const row of (data ?? []) as { writer_name: string }[]) {
      counts.set(row.writer_name, (counts.get(row.writer_name) ?? 0) + 1);
    }
    const writers: WorkWriterGroup[] = Array.from(counts.entries())
      .map(([writer_name, count]) => ({ writer_name, count }))
      .sort((a, b) => a.writer_name.localeCompare(b.writer_name, 'ko'));

    return NextResponse.json({ writers });
  } catch (err) {
    console.error('저작물 작가 목록 API 오류:', err);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
