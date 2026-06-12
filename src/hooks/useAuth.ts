import { useEffect, useState, useMemo } from 'react';
import { logger } from '@/lib/utils/logger';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/store/authStore';
import { AuthUser, UserRole, Permission } from '@/types';
import { validatePrismFilterEmail } from '@/lib/auth/emailValidator';
import type { Session } from '@supabase/supabase-js';

// 인증 확인 안전 타임아웃 — 어떤 경우에도 로딩이 무한 대기하지 않도록 보장
const AUTH_TIMEOUT_MS = 8000;

export function useAuth() {
  const { user: storeUser, setUser: setStoreUser } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<AuthUser | null>(null);
  // 클라이언트 재생성 방지 (createBrowserClient는 싱글턴이지만 deps 안정화 목적)
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    let isMounted = true;

    // 세션에서 사용자 정보(역할·이름·권한) 로드 — checkAuth와 이벤트 핸들러가 공유
    const loadUser = async (session: Session): Promise<void> => {
      const validation = validatePrismFilterEmail(session.user.email || '');
      if (!validation.valid) {
        logger.warn('❌ 이메일 도메인 검증 실패:', session.user.email);
        await supabase.auth.signOut();
        if (isMounted) {
          setUser(null);
          setStoreUser(null);
        }
        return;
      }

      // 역할 + 이름 조회 (name 컬럼 없을 경우 role만 재시도)
      let roleData: { role?: string; name?: string } | null = null;
      try {
        const result = await supabase
          .from('user_roles')
          .select('role, name')
          .eq('user_id', session.user.id)
          .maybeSingle();
        if (result.error) {
          logger.warn('⚠️ role+name 조회 실패, role만 재시도:', result.error.message);
          const fallback = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', session.user.id)
            .maybeSingle();
          roleData = fallback.data;
        } else {
          roleData = result.data;
        }
      } catch (err) {
        logger.error('⚠️ 역할 조회 오류 (무시):', err);
      }

      // 권한 조회 (에러 무시)
      let permData: { permission_code: string }[] = [];
      try {
        const result = await supabase
          .from('user_permissions')
          .select('permission_code')
          .eq('user_id', session.user.id);
        permData = result.data || [];
      } catch (err) {
        logger.error('⚠️ 권한 조회 오류 (무시):', err);
      }

      const authUser: AuthUser = {
        id: session.user.id,
        email: session.user.email || '',
        name: roleData?.name ?? null,
        role: (roleData?.role ?? null) as UserRole | null,
        permissions: permData.map((p) => p.permission_code as Permission),
      };

      if (isMounted) {
        setUser(authUser);
        setStoreUser(authUser);
        logger.log('✅ 사용자 상태 저장 완료:', authUser.email);
      }
    };

    const checkAuth = async () => {
      try {
        logger.log('🔍 세션 확인 중...');
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          logger.error('⚠️ 세션 조회 오류:', error.message);
        }
        if (!isMounted) return;

        if (session?.user) {
          logger.log('✅ 세션 발견:', session.user.email);
          await loadUser(session);
        } else {
          logger.log('ℹ️ 로그인된 세션 없음');
          setUser(null);
          setStoreUser(null);
        }
      } catch (error) {
        logger.error('❌ 인증 확인 오류:', error);
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

    // 안전장치: 데드락·네트워크 지연 등 어떤 상황에도 로딩 화면이 멈추지 않도록 강제 해제
    const safetyTimer = setTimeout(() => {
      if (isMounted) {
        logger.warn(`⏱️ 인증 확인 ${AUTH_TIMEOUT_MS / 1000}초 초과 — 로딩 강제 해제`);
        setIsLoading(false);
      }
    }, AUTH_TIMEOUT_MS);

    checkAuth().finally(() => clearTimeout(safetyTimer));

    // ⚠️ 콜백은 동기로 유지 — async 콜백은 Supabase auth 잠금과 교착(데드락) 유발
    //    실제 작업은 setTimeout(0)으로 잠금 해제 이후에 실행 (공식 권장 패턴)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!isMounted) return;
        logger.log('🔔 인증 이벤트:', event);

        // 초기 세션은 checkAuth가 처리 — 중복 조회 방지
        if (event === 'INITIAL_SESSION') return;

        setTimeout(() => {
          if (!isMounted) return;
          if (session?.user) {
            loadUser(session);
          } else {
            setUser(null);
            setStoreUser(null);
            logger.log('🔄 로그아웃됨');
          }
        }, 0);
      }
    );

    return () => {
      isMounted = false;
      clearTimeout(safetyTimer);
      subscription?.unsubscribe();
    };
  }, [supabase, setStoreUser]);

  return {
    user: user || storeUser,
    isLoading,
    isAuthenticated: !!(user || storeUser),
  };
}
