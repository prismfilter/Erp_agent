import { NextRequest, NextResponse } from 'next/server';
import { requireStaff, isErrorResponse } from '@/lib/auth/apiAuth';
import { parseBody } from '@/lib/validation/parse';
import { adminUserUpdateSchema } from '@/lib/validation/schemas';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    const parsed = parseBody(adminUserUpdateSchema, await req.json());
    if (!parsed.success) return parsed.response;
    const { name, role, contract_date } = parsed.data;

    // 관리자 권한 확인
    const auth = await requireStaff(true);
    if (isErrorResponse(auth)) return auth;

    // 업데이트 필드 구성
    const updates: Record<string, string | null> = {};
    if (name !== undefined) updates.name = name?.trim() ?? null;
    if (role !== undefined) updates.role = role;
    if (contract_date !== undefined) updates.contract_date = contract_date ?? null;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: '변경할 내용이 없습니다.' }, { status: 400 });
    }

    const { error } = await auth.adminClient
      .from('user_roles')
      .update(updates)
      .eq('user_id', userId);

    if (error) {
      console.error('사용자 업데이트 오류:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('API 오류:', err);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
