import { NextRequest, NextResponse } from 'next/server';
import { getAuthedUser, isErrorResponse, canSelfAssignRole } from '@/lib/auth/apiAuth';
import { parseBody } from '@/lib/validation/parse';
import { userRoleSchema } from '@/lib/validation/schemas';

export async function PATCH(req: NextRequest) {
  try {
    const parsed = parseBody(userRoleSchema, await req.json());
    if (!parsed.success) return parsed.response;
    const { role } = parsed.data;

    const authed = await getAuthedUser();
    if (isErrorResponse(authed)) return authed;

    // 권한 상승 방지: 본인은 작가 역할로만 자가 지정 가능
    // (STAFF/ADMIN 승격은 관리자가 /api/admin/users 경로로만 수행)
    if (!canSelfAssignRole(authed.role, role)) {
      return NextResponse.json(
        { error: '해당 역할은 직접 설정할 수 없습니다. 관리자에게 문의하세요.' },
        { status: 403 }
      );
    }

    const { error } = await authed.adminClient
      .from('user_roles')
      .upsert({ user_id: authed.userId, role }, { onConflict: 'user_id' });

    if (error) {
      console.error('역할 저장 오류:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, role });
  } catch (err) {
    console.error('API 오류:', err);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
