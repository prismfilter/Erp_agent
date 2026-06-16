-- ============================================================================
-- 신규 사용자 생성 오류 수정 (006_fix_new_user_trigger.sql)
-- 원인: auth.users에 걸린 기본 트리거가 없는 테이블(profiles 등)을 참조해 실패
-- 해결: 기존 트리거/함수 제거 후, user_roles에 pending 행을 자동 생성하는 트리거 추가
-- ============================================================================

-- 기존 트리거 및 함수 제거 (없으면 무시)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- 신규 사용자 가입 시 user_roles에 pending 상태로 자동 등록
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role, status)
  VALUES (NEW.id, 'STAFF', 'pending')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- auth.users INSERT 시 트리거 실행
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
