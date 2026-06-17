-- ============================================================================
-- 작가 마스터: 재계약일 컬럼 추가 + 백필 (018_writer_recontract_date.sql)
-- 재계약일을 곡 단위(music_works.recontract_date)에서 작가 단위(writers)로 이동한다.
-- 기존 작가는 자기 곡들의 재계약일로 백필(작가별 단일 값). music_works.recontract_date는 보존.
-- 참조 패턴: 011_writers_master.sql / 017_writer_rates.sql
-- ============================================================================

ALTER TABLE public.writers
  ADD COLUMN IF NOT EXISTS recontract_date DATE;  -- 전속작가 재계약일, NULL=미지정

COMMENT ON COLUMN public.writers.recontract_date IS '전속작가 재계약일, NULL=미지정';

-- 백필: music_works의 writer_name 매칭으로 작가별 재계약일 채움(작가별 단일 값이라 MAX 안전)
UPDATE public.writers w
SET recontract_date = sub.rc
FROM (
  SELECT writer_name, MAX(recontract_date) AS rc
  FROM public.music_works
  WHERE recontract_date IS NOT NULL
  GROUP BY writer_name
) sub
WHERE w.name = sub.writer_name;
