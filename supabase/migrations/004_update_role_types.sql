-- 역할 체계 개편: WRITER 제거 → EXCLUSIVE_WRITER(전속 작가), GENERAL_WRITER(일반 작가) 분리
ALTER TABLE public.user_roles
  DROP CONSTRAINT IF EXISTS user_roles_role_check;

ALTER TABLE public.user_roles
  ADD CONSTRAINT user_roles_role_check
  CHECK (role IN ('ADMIN', 'STAFF', 'EXCLUSIVE_WRITER', 'GENERAL_WRITER'));

-- 기존 WRITER 역할을 EXCLUSIVE_WRITER로 마이그레이션
UPDATE public.user_roles SET role = 'EXCLUSIVE_WRITER' WHERE role = 'WRITER';
