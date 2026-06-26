// 저작물 등록용 다음 NO. 조회 (현재 최대 NO. + 1)
// 조회: ADMIN/STAFF

import { NextResponse } from 'next/server';
import { requireStaff, isErrorResponse } from '@/lib/auth/apiAuth';

// GET /api/works/next-no — { nextNo }
export async function GET() {
  try {
    const auth = await requireStaff();
    if (isErrorResponse(auth)) return auth;

    const { data, error } = await auth.adminClient
      .from('works')
      .select('no')
      .order('no', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ nextNo: (data?.no ?? 0) + 1 });
  } catch (err) {
    console.error('다음 NO. API 오류:', err);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
