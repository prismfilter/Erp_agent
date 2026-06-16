-- user_roles 테이블에 이름 컬럼 추가
ALTER TABLE public.user_roles
  ADD COLUMN IF NOT EXISTS name VARCHAR(100);
