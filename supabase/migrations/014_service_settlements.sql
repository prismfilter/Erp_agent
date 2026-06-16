-- ============================================================================
-- 용역 정산 (014_service_settlements.sql)
-- 입금 완료(status='paid')된 청구서를 작가·기간별로 모아 작가지급액을 정산한다.
-- ============================================================================

-- 입금 완료 시각: 청구서 상태를 'paid'로 바꾼 시점. 정산 기간 매칭의 기준 날짜.
-- (paid 외 상태로 되돌리면 애플리케이션에서 NULL로 갱신)
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_invoices_paid_at ON public.invoices(paid_at);

-- ── 용역 정산 레코드 ─────────────────────────────────────────────────────────
-- detail: 정산 시점 스냅샷(이후 청구서가 바뀌어도 정산서는 고정).
--   [{ invoice_id, invoice_date, paid_at, client_name, title, description, writer_pay }]
CREATE TABLE IF NOT EXISTS public.service_settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  writer_name TEXT NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  total_amount BIGINT NOT NULL DEFAULT 0,   -- 총 작가지급액
  detail JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_service_settlements_writer ON public.service_settlements(writer_name);
CREATE INDEX IF NOT EXISTS idx_service_settlements_period ON public.service_settlements(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_service_settlements_created ON public.service_settlements(created_at DESC);

-- ── RLS: ADMIN/STAFF만 접근 (007 패턴 동일) ──────────────────────────────────
ALTER TABLE public.service_settlements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS staff_all_service_settlements ON public.service_settlements;
CREATE POLICY staff_all_service_settlements ON public.service_settlements FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role IN ('ADMIN', 'STAFF')
    )
  );
