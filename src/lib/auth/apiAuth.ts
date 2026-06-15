// API 라우트 공용 인증/인가 헬퍼
// 세션 확인은 anon 쿠키 클라이언트로, 역할 검사·데이터 접근은 service_role 클라이언트로 수행한다.

import { createServerClient } from '@supabase/ssr';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import type { UserRole } from '@/types';
import { isAllowedEmail, ALLOWED_EMAIL_DOMAIN } from './domain';

interface AuthedUser {
  userId: string;
  email: string;
  role: UserRole | null;
  adminClient: SupabaseClient;
}

export interface StaffAuthResult {
  userId: string;
  role: UserRole;
  adminClient: SupabaseClient;
}

// service_role 클라이언트 (RLS 우회) — 서버 전용
function createAdminClient(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// 세션 확인 후 사용자 식별 정보 + 현재 역할 반환. 미인증 시 401 NextResponse.
// 역할 제약 없이 "로그인 여부"만 필요한 라우트(본인 프로필 등)에서 사용.
export async function getAuthedUser(): Promise<AuthedUser | NextResponse> {
  const cookieStore = await cookies();
  const authClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );

  const { data: { user }, error: authError } = await authClient.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
  }

  // 도메인 검증: 회사 계정(@prism-filter.com) 외 모든 세션은 데이터 접근 차단.
  // 모든 API가 getAuthedUser(또는 requireStaff→getAuthedUser)를 거치므로 여기서 일괄 보호된다.
  if (!isAllowedEmail(user.email)) {
    return NextResponse.json(
      { error: `접근이 허용되지 않은 계정입니다. 회사 계정(@${ALLOWED_EMAIL_DOMAIN})으로 로그인하세요.` },
      { status: 403 }
    );
  }

  const adminClient = createAdminClient();
  const { data: roleRow } = await adminClient
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle();

  return {
    userId: user.id,
    email: user.email ?? '',
    role: (roleRow?.role ?? null) as UserRole | null,
    adminClient,
  };
}

// ADMIN/STAFF 권한 확인. 실패 시 NextResponse 반환 (성공 시 StaffAuthResult)
export async function requireStaff(adminOnly = false): Promise<StaffAuthResult | NextResponse> {
  const authed = await getAuthedUser();
  if (authed instanceof NextResponse) return authed;

  const { userId, role, adminClient } = authed;
  if (adminOnly && role !== 'ADMIN') {
    return NextResponse.json({ error: '관리자 권한이 필요합니다.' }, { status: 403 });
  }
  if (!adminOnly && role !== 'ADMIN' && role !== 'STAFF') {
    return NextResponse.json({ error: '접근 권한이 없습니다.' }, { status: 403 });
  }

  return { userId, role: role!, adminClient };
}

// 타입 가드: NextResponse 여부 판별
export function isErrorResponse<T>(result: T | NextResponse): result is NextResponse {
  return result instanceof NextResponse;
}

// ── 본인 역할 자가 설정 정책 ────────────────────────────────────────────────
// 권한 상승 방지: 본인이 스스로 지정할 수 있는 역할은 작가 역할로만 제한한다.
// STAFF/ADMIN 승격은 반드시 관리자가 /api/admin/users 경로로만 수행한다.
export const SELF_ASSIGNABLE_ROLES: UserRole[] = ['EXCLUSIVE_WRITER', 'GENERAL_WRITER'];

// 본인 역할 변경 요청이 허용되는지 검사.
// - 현재 역할과 동일하면 변경 없음(허용)
// - 다르면 작가 역할로의 변경만 허용 (STAFF/ADMIN 자가 승격 차단)
export function canSelfAssignRole(currentRole: UserRole | null, nextRole: UserRole): boolean {
  if (currentRole === nextRole) return true;
  return SELF_ASSIGNABLE_ROLES.includes(nextRole);
}
