import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { UserRole } from '@/types';

const VALID_ROLES: UserRole[] = ['ADMIN', 'STAFF', 'EXCLUSIVE_WRITER', 'GENERAL_WRITER'];

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, role } = body as { name?: string; role?: UserRole };

    // 세션 확인
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

    // 업데이트할 필드 구성
    const updates: Record<string, string> = {};
    if (name !== undefined) updates.name = name.trim();
    if (role !== undefined) {
      if (!VALID_ROLES.includes(role)) {
        return NextResponse.json({ error: '유효하지 않은 역할입니다.' }, { status: 400 });
      }
      updates.role = role;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: '변경할 내용이 없습니다.' }, { status: 400 });
    }

    // 서비스 롤 키로 RLS 우회
    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { error } = await adminClient
      .from('user_roles')
      .upsert(
        { user_id: user.id, ...updates },
        { onConflict: 'user_id' }
      );

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
