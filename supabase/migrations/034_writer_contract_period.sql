-- ============================================================================
-- 034: 작가 계약 기간 (writers.contract_start / contract_end)
-- ----------------------------------------------------------------------------
-- 작가 상세 '계약정보'에 계약 기간(계약시작 ~ 계약종료)을 추가한다.
-- 재계약일(recontract_date)과는 별개. nullable(미지정 허용).
-- ============================================================================

ALTER TABLE public.writers
  ADD COLUMN IF NOT EXISTS contract_start DATE,  -- 계약 시작일 (NULL=미지정)
  ADD COLUMN IF NOT EXISTS contract_end   DATE;  -- 계약 종료일 (NULL=미지정)

COMMENT ON COLUMN public.writers.contract_start IS '계약 시작일 (NULL=미지정)';
COMMENT ON COLUMN public.writers.contract_end   IS '계약 종료일 (NULL=미지정)';
