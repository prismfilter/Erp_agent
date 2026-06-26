-- ============================================================================
-- 작가 활동명(영문) 컬럼 추가 (031)
-- 작가 상세 페이지: 활동명(stage_name)과 원작자 코드 사이에 활동명(EN) 표시.
-- forward-only: 기존 마이그레이션 수정 금지.
-- ============================================================================

ALTER TABLE public.writers
  ADD COLUMN IF NOT EXISTS stage_name_en TEXT;

COMMENT ON COLUMN public.writers.stage_name_en IS '활동명(영문)';
