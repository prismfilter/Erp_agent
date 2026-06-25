-- ============================================================================
-- 기타 카테고리 레슨·채보·플레이백 6행을 '비용 논의 필요'(협의형)로 전환 (023)
-- 022 재시드에서 '제안 청구가'로 넣었던 6행을 사용자 결정에 따라 협의형으로 변경.
--   billing_price = NULL, is_formula = true, formula_note = '비용 논의 필요'
-- '레코딩 오퍼레이팅 (1프로당)'(250,000)은 그대로 유지(협의 대상 아님).
-- ============================================================================

UPDATE public.price_items
SET billing_price = NULL,
    is_formula    = true,
    formula_note  = '비용 논의 필요'
WHERE category = '기타'
  AND name IN (
    '레슨 1회당 (시간당)',
    '악보 채보비 (곡별)',
    '컨텐츠/광고 플레이백',
    '행사/페스티벌 플레이백',
    '위문열차 플레이백',
    '콘서트 플레이백'
  );

-- 검증: 기타 카테고리의 협의형(is_formula=true) 행이 정확히 6건이어야 한다.
DO $$
DECLARE
  formula_cnt INT;
BEGIN
  SELECT COUNT(*) INTO formula_cnt
  FROM public.price_items
  WHERE category = '기타' AND is_formula = true AND formula_note = '비용 논의 필요';
  IF formula_cnt <> 6 THEN
    RAISE EXCEPTION '기타 협의형 행 수가 6이 아님: %', formula_cnt;
  END IF;
END $$;
