import { NextResponse } from 'next/server';
import { requireStaff, isErrorResponse } from '@/lib/auth/apiAuth';

export async function GET() {
  try {
    // 관리자 권한 확인
    const auth = await requireStaff(true);
    if (isErrorResponse(auth)) return auth;

    // 전체 사용자 목록 조회
    const { data, error } = await auth.adminClient
      .from('user_roles')
      .select('id, user_id, name, role, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ users: data });
  } catch (err) {
    console.error('API 오류:', err);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
