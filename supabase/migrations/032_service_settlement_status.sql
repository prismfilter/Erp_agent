-- ============================================================================
-- 032: 용역 정산 상태(미정산/정산완료) 영속화 (service_settlement_status)
-- ----------------------------------------------------------------------------
-- 용역 정산 목록은 paid 청구서에서 (작가 × 거래) 단위로 파생되며, 데이터 자체는
-- 비영속이다. 유일하게 사용자가 토글하는 '상태'만 이 테이블에 저장한다.
--   - 레코드 존재 = 정산완료 / 레코드 없음 = 미정산 (기본값)
--   - 행 식별 = (invoice_id, writer_name)  ← 작가 × 거래(청구서) 단위
-- 청구서 삭제 시 ON DELETE CASCADE로 상태도 함께 정리된다.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.service_settlement_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  writer_name TEXT NOT NULL,
  settled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  settled_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (invoice_id, writer_name)
);

CREATE INDEX IF NOT EXISTS idx_sss_invoice ON public.service_settlement_status(invoice_id);

-- ── RLS: ADMIN/STAFF만 접근 (008 패턴 — USING + WITH CHECK 양쪽) ──────────────
ALTER TABLE public.service_settlement_status ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS staff_all_service_settlement_status ON public.service_settlement_status;
CREATE POLICY staff_all_service_settlement_status ON public.service_settlement_status FOR ALL
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
  );
