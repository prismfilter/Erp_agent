-- ============================================================================
-- 작가 마스터: 수수료 요율 컬럼 추가 (011_writers_master.sql)
-- 관리 섹션 "작가 마스터" 페이지에서 작가명·구분(전속/일반)·수수료 요율(%)을 관리한다.
-- 로그인 계정(user_roles)과 무관한 작가/작업자 마스터 레지스트리.
-- ============================================================================

-- 수수료 요율: 퍼센트(0~100), 기본 70% (작가 지급 비율)
ALTER TABLE public.writers
  ADD COLUMN IF NOT EXISTS fee_rate NUMERIC NOT NULL DEFAULT 70;

-- writer_type 값 규약: '전속작가' | '일반작가' (애플리케이션에서 강제, 기존 자유 텍스트 호환)
COMMENT ON COLUMN public.writers.writer_type IS '작가 구분: 전속작가 | 일반작가';
COMMENT ON COLUMN public.writers.fee_rate IS '수수료 요율(%) 0~100';
