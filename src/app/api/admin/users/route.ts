import { NextResponse } from 'next/server';
import { requireStaff, isErrorResponse } from '@/lib/auth/apiAuth';
import { serverError, dbError } from '@/lib/api/respond';
import { mergeUsersWithAuth, type AuthLite, type RoleRow } from '@/lib/admin/userMerge';

export async function GET() {
  try {
    // 관리자 권한 확인
    const auth = await requireStaff(true);
    if (isErrorResponse(auth)) return auth;

    // user_roles 목록
    const { data: roles, error } = await auth.adminClient
      .from('user_roles')
      .select('id, user_id, name, role, contract_date, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      return dbError('API 오류', error);
    }

    // auth.users에서 이메일·메타데이터 (service_role 전용 admin API). 사용자 수가 적어 1페이지로 충분.
    const { data: authData } = await auth.adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const authUsers: AuthLite[] = (authData?.users ?? []).map((u) => ({
      id: u.id,
      email: u.email ?? null,
      last_sign_in_at: u.last_sign_in_at ?? null,
      provider: u.app_metadata?.provider ?? null,
      avatar_url:
        (u.user_metadata?.avatar_url as string | undefined) ??
        (u.user_metadata?.picture as string | undefined) ??
        null,
    }));

    const users = mergeUsersWithAuth((roles ?? []) as RoleRow[], authUsers);
    return NextResponse.json({ users });
  } catch (err) {
    return serverError('API 오류', err);
  }
}
