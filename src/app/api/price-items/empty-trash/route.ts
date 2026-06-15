// 프라이스 테이블 휴지통 비우기 — 휴지통의 모든 항목 영구삭제 (ADMIN only)

import { NextResponse } from 'next/server';
import { requireStaff, isErrorResponse } from '@/lib/auth/apiAuth';

// POST /api/price-items/empty-trash
export async function POST() {
  try {
    const auth = await requireStaff(true);
    if (isErrorResponse(auth)) return auth;

    // 휴지통(deleted_at IS NOT NULL) 전체 영구삭제. FK는 ON DELETE SET NULL.
    const { error } = await auth.adminClient
      .from('price_items')
      .delete()
      .not('deleted_at', 'is', null);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('휴지통 비우기 API 오류:', err);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
