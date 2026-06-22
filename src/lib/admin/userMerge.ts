// 관리자 사용자 목록 — user_roles 행과 auth.users(이메일·메타데이터)를 병합하는 순수 로직.
// DOM·DB 비의존 → vitest(node)로 단위테스트. API 라우트가 Supabase User → AuthLite로 추출 후 이 함수를 호출.

export interface RoleRow {
  id: string;
  user_id: string;
  name: string | null;
  role: string | null;
  contract_date: string | null;
  created_at: string;
}

export interface AuthLite {
  id: string;
  email: string | null;
  last_sign_in_at: string | null;
  provider: string | null;
  avatar_url: string | null;
}

export interface AdminUser extends RoleRow {
  email: string | null;
  last_sign_in_at: string | null;
  provider: string | null;
  avatar_url: string | null;
}

// user_id 기준으로 auth 메타데이터를 붙인다. auth에 없는 사용자는 null.
export function mergeUsersWithAuth(roles: RoleRow[], authUsers: AuthLite[]): AdminUser[] {
  const byId = new Map(authUsers.map((a) => [a.id, a]));
  return roles.map((r) => {
    const a = byId.get(r.user_id);
    return {
      ...r,
      email: a?.email ?? null,
      last_sign_in_at: a?.last_sign_in_at ?? null,
      provider: a?.provider ?? null,
      avatar_url: a?.avatar_url ?? null,
    };
  });
}
