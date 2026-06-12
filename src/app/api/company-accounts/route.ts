// 회사 입금계좌 목록 (드롭다운용)

import { NextResponse } from 'next/server';
import { requireStaff, isErrorResponse } from '@/lib/auth/apiAuth';

export async function GET() {
  try {
    const auth = await requireStaff();
    if (isErrorResponse(auth)) return auth;

    const { data, error } = await auth.adminClient
      .from('company_accounts')
      .select('*')
      .order('is_default', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ accounts: data });
  } catch (err) {
    console.error('회사 계좌 API 오류:', err);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
