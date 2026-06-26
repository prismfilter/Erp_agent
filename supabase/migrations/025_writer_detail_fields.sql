-- ============================================================================
-- 작가 상세 정보 필드 추가 (025)
-- 작가 상세 페이지용: 영문명·활동명·포지션(A/C/AR 다중)·원작자 코드.
-- forward-only: 기존 마이그레이션 수정 금지.
-- ============================================================================

ALTER TABLE public.writers
  ADD COLUMN IF NOT EXISTS english_name         TEXT,
  ADD COLUMN IF NOT EXISTS stage_name           TEXT,
  ADD COLUMN IF NOT EXISTS position             TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS original_writer_code TEXT;

COMMENT ON COLUMN public.writers.english_name         IS '영문명';
COMMENT ON COLUMN public.writers.stage_name           IS '활동명';
COMMENT ON COLUMN public.writers.position             IS '포지션 A(작사)/C(작곡)/AR(편곡) 다중. 빈 배열=미정';
COMMENT ON COLUMN public.writers.original_writer_code IS '원작자 코드(실제 저작물에 쓰이는 작가코드)';
