-- ============================================================================
-- 008: 인보이스 관련 테이블 RLS에 WITH CHECK 절 추가
-- ----------------------------------------------------------------------------
-- 007의 staff_all_* 정책은 FOR ALL USING만 정의되어 INSERT/UPDATE 시 행 값
-- 검증(WITH CHECK)이 없었다. USING은 "어떤 행을 읽고/대상으로 삼을 수 있나",
-- WITH CHECK는 "어떤 행을 쓸 수 있나"를 통제한다. WITH CHECK가 없으면 RLS
-- 직접 경로에서 STAFF/ADMIN이 조건을 만족하는 한 임의 값으로 INSERT/UPDATE가
-- 가능하므로, 동일 조건을 WITH CHECK에도 명시해 2차 방어선을 보강한다.
-- ============================================================================

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['price_items', 'clients', 'company_accounts', 'invoices', 'invoice_items']
  LOOP
    -- 기존 정책 제거 후 USING + WITH CHECK 양쪽을 갖춘 정책으로 재생성
    EXECUTE format('DROP POLICY IF EXISTS staff_all_%1$s ON public.%1$s', t);
    EXECUTE format($f$
      CREATE POLICY staff_all_%1$s ON public.%1$s FOR ALL
        USING (
          EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_id = auth.uid() AND role IN ('ADMIN', 'STAFF')
          )
        )
        WITH CHECK (
          EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_id = auth.uid() AND role IN ('ADMIN', 'STAFF')
          )
        )
    $f$, t);
  END LOOP;
END $$;
