import { NextRequest, NextResponse } from 'next/server';
import { getAuthedUser, isErrorResponse, canSelfAssignRole } from '@/lib/auth/apiAuth';
import { parseBody } from '@/lib/validation/parse';
import { userProfileSchema } from '@/lib/validation/schemas';

export async function PATCH(req: NextRequest) {
  try {
    const parsed = parseBody(userProfileSchema, await req.json());
    if (!parsed.success) return parsed.response;
    const { name, role } = parsed.data;

    const authed = await getAuthedUser();
    if (isErrorResponse(authed)) return authed;

    // 업데이트할 필드 구성
    const updates: Record<string, string> = {};
    if (name !== undefined && name !== null) updates.name = name.trim();
    if (role !== undefined) {
      // 권한 상승 방지: 본인은 작가 역할로만 자가 지정 가능
      if (!canSelfAssignRole(authed.role, role)) {
        return NextResponse.json(
          { error: '해당 역할은 직접 설정할 수 없습니다. 관리자에게 문의하세요.' },
          { status: 403 }
        );
      }
      updates.role = role;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: '변경할 내용이 없습니다.' }, { status: 400 });
    }

    const { error } = await authed.adminClient
      .from('user_roles')
      .upsert({ user_id: authed.userId, ...updates }, { onConflict: 'user_id' });

    if (error) {
      console.error('프로필 저장 오류:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('API 오류:', err);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
