// 인보이스 API 공용 인증 헬퍼
// 기존 패턴(api/admin/users)을 재사용 — 세션 확인 후 서비스 롤 클라이언트로 역할 검사

import { createServerClient } from '@supabase/ssr';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

interface AuthResult {
  userId: string;
  role: string;
  adminClient: SupabaseClient;
}

// ADMIN/STAFF 권한 확인. 실패 시 NextResponse 반환 (성공 시 AuthResult)
export async function requireStaff(adminOnly = false): Promise<AuthResult | NextResponse> {
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

  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: callerRole } = await adminClient
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle();

  const role = callerRole?.role;
  if (adminOnly && role !== 'ADMIN') {
    return NextResponse.json({ error: '관리자 권한이 필요합니다.' }, { status: 403 });
  }
  if (!adminOnly && role !== 'ADMIN' && role !== 'STAFF') {
    return NextResponse.json({ error: '접근 권한이 없습니다.' }, { status: 403 });
  }

  return { userId: user.id, role: role!, adminClient };
}

// 타입 가드: NextResponse 여부 판별
export function isErrorResponse(result: AuthResult | NextResponse): result is NextResponse {
  return result instanceof NextResponse;
}
