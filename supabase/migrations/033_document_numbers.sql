-- ============================================================================
-- 033: 문서번호 채번 (document_numbers)
-- ----------------------------------------------------------------------------
-- 거래처 청구서/내부 지급서/용역 정산서에 고유 문서번호(YYYY-NNN호)를 부여한다.
--   - doc_type 'invoice'  : 청구서·지급서(한 invoice의 두 뷰가 같은 번호 공유), 연도=invoice_date
--   - doc_type 'settlement': 용역 정산서, (invoice×writer) 행당 고유, 연도=paid_at
-- 교차 타입 중복 허용(서로 다른 문서) / 타입·연도 내 seq 고유 / 엔티티당 1번호(영구 고정).
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.document_numbers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doc_type TEXT NOT NULL,        -- 'invoice' | 'settlement'
  doc_year INT NOT NULL,
  seq INT NOT NULL,
  entity_key TEXT NOT NULL,      -- invoice_id, 또는 `${invoice_id}::${writer_name}`
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (doc_type, entity_key),       -- 엔티티당 1번호(멱등)
  UNIQUE (doc_type, doc_year, seq)     -- 타입·연도 내 고유
);

CREATE INDEX IF NOT EXISTS idx_docnum_type_year ON public.document_numbers(doc_type, doc_year);

-- ── RLS: ADMIN/STAFF만 접근 (008 패턴 — USING + WITH CHECK) ──────────────────
ALTER TABLE public.document_numbers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS staff_all_document_numbers ON public.document_numbers;
CREATE POLICY staff_all_document_numbers ON public.document_numbers FOR ALL
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
