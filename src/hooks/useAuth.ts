import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/store/authStore';
import { AuthUser } from '@/types';
import { validatePrismFilterEmail } from '@/lib/auth/emailValidator';

export function useAuth() {
  const { user: storeUser, setUser: setStoreUser } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<AuthUser | null>(null);
  const supabase = createClient();

  useEffect(() => {
    let isMounted = true;

    const checkAuth = async () => {
      try {
        console.log('🔍 세션 확인 중...');

        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          console.error('⚠️ 세션 조회 오류:', error.message);
        }

        if (!isMounted) return;

        if (session?.user) {
          console.log('✅ 세션 발견:', session.user.email);

          const validation = validatePrismFilterEmail(session.user.email || '');
          if (!validation.valid) {
            console.warn('❌ 이메일 도메인 검증 실패:', session.user.email);
            await supabase.auth.signOut();
            setUser(null);
            setStoreUser(null);
            setIsLoading(false);
            return;
          }

          console.log('✅ 이메일 도메인 검증 성공');

          // 역할 조회 (에러 무시)
          let roleData = null;
          try {
            const result = await supabase
              .from('user_roles')
              .select('role')
              .eq('user_id', session.user.id)
              .maybeSingle();
            roleData = result.data;
          } catch (err) {
            console.error('⚠️ 역할 조회 오류 (무시):', err);
          }

          // 권한 조회 (에러 무시)
          let permData: any[] = [];
          try {
            const result = await supabase
              .from('user_permissions')
              .select('permission_code')
              .eq('user_id', session.user.id);
            permData = result.data || [];
          } catch (err) {
            console.error('⚠️ 권한 조회 오류 (무시):', err);
          }

          const role = roleData?.role || 'WRITER';
          console.log('👤 사용자 역할:', role, '| 이메일:', session.user.email);

          const authUser: AuthUser = {
            id: session.user.id,
            email: session.user.email || '',
            role: role,
            permissions: permData?.map((p) => p.permission_code) || [],
          };

          if (isMounted) {
            setUser(authUser);
            setStoreUser(authUser);
            console.log('✅ 사용자 상태 저장 완료');
          }
        } else {
          console.log('ℹ️ 로그인된 세션 없음');
          if (isMounted) {
            setUser(null);
            setStoreUser(null);
          }
        }
      } catch (error) {
        console.error('❌ 인증 확인 오류:', error);
        if (isMounted) {
          setUser(null);
          setStoreUser(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return;

        console.log('🔔 인증 이벤트:', event);

        if (session?.user) {
          const validation = validatePrismFilterEmail(session.user.email || '');
          if (!validation.valid) {
            console.warn('❌ 이메일 도메인 검증 실패:', session.user.email);
            await supabase.auth.signOut();
            if (isMounted) {
              setUser(null);
              setStoreUser(null);
            }
            return;
          }

          // 역할 조회
          let roleData = null;
          try {
            const result = await supabase
              .from('user_roles')
              .select('role')
              .eq('user_id', session.user.id)
              .maybeSingle();
            roleData = result.data;
          } catch (err) {
            console.error('⚠️ 역할 조회 오류:', err);
          }

          // 권한 조회
          let permData: any[] = [];
          try {
            const result = await supabase
              .from('user_permissions')
              .select('permission_code')
              .eq('user_id', session.user.id);
            permData = result.data || [];
          } catch (err) {
            console.error('⚠️ 권한 조회 오류:', err);
          }

          const authUser: AuthUser = {
            id: session.user.id,
            email: session.user.email || '',
            role: roleData?.role || 'WRITER',
            permissions: permData?.map((p) => p.permission_code) || [],
          };

          if (isMounted) {
            setUser(authUser);
            setStoreUser(authUser);
            console.log('✅ 인증 상태 업데이트:', authUser.email);
          }
        } else {
          if (isMounted) {
            setUser(null);
            setStoreUser(null);
            console.log('🔄 로그아웃됨');
          }
        }
      }
    );

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
    };
  }, [supabase, setStoreUser]);

  return {
    user: user || storeUser,
    isLoading,
    isAuthenticated: !!(user || storeUser),
  };
}
