-- user_roles 테이블에 계약일 컬럼 추가
ALTER TABLE public.user_roles
  ADD COLUMN IF NOT EXISTS contract_date DATE;
