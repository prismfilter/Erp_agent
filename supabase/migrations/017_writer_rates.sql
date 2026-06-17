-- ============================================================================
-- 작가 마스터: 영구/일반 저작물 요율 컬럼 추가 (017_writer_rates.sql)
-- 작가별 영구 저작물 요율(%)·일반 저작물 요율(%)을 관리한다(작가 레벨 기본 요율).
-- nullable(기본값 없음) → NULL = 미지정. 기존 작가는 적용 즉시 전부 미지정.
-- 참조 패턴: 011_writers_master.sql
-- ============================================================================

ALTER TABLE public.writers
  ADD COLUMN IF NOT EXISTS permanent_rate NUMERIC,  -- 영구 저작물 요율(%) 0~100, NULL=미지정
  ADD COLUMN IF NOT EXISTS general_rate   NUMERIC;  -- 일반 저작물 요율(%) 0~100, NULL=미지정

COMMENT ON COLUMN public.writers.permanent_rate IS '영구 저작물 요율(%) 0~100, NULL=미지정';
COMMENT ON COLUMN public.writers.general_rate   IS '일반 저작물 요율(%) 0~100, NULL=미지정';
