-- ============================================================================
-- 009: 청구서 라인 항목에 할인금액·작가수수료율 컬럼 추가
-- ----------------------------------------------------------------------------
-- 할인을 별도 행(item_type='discount', 음수 공급가액)으로 다루던 방식에서
-- 행 단위 할인금액(원) + 작가수수료율(%) 모델로 전환한다.
--   순매출   = supply_amount − discount_amount
--   작가지급 = trunc(순매출 × writer_pay_rate / 100)
--   귀속금액 = 순매출 − 작가지급
-- supply_amount는 할인 전 공급가액(입력값)으로 유지하고, writer_pay에는 계산된
-- 작가지급 금액을 저장한다(엑셀 SUM·매출 집계 호환). 진실의 원천은 세 컬럼.
-- 레거시 item_type='discount' 행의 타입/CHECK 제약은 하위호환을 위해 유지.
-- ============================================================================

ALTER TABLE public.invoice_items
  ADD COLUMN IF NOT EXISTS discount_amount BIGINT  NOT NULL DEFAULT 0,   -- 할인금액(원)
  ADD COLUMN IF NOT EXISTS writer_pay_rate NUMERIC NOT NULL DEFAULT 70;  -- 작가수수료율 % (0~100)
