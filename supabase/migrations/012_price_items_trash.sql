-- ============================================================================
-- 프라이스 테이블 휴지통 (012_price_items_trash.sql)
-- soft delete(deleted_at) + 안전한 영구삭제를 위한 FK 정리.
-- ============================================================================

-- 휴지통 타임스탬프: NULL = 정상, 값이 있으면 휴지통(이동 시각). 30일 경과 시 자동 영구삭제(앱 지연 정리).
ALTER TABLE public.price_items
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_price_items_deleted_at ON public.price_items(deleted_at);

-- invoice_items.price_item_id 외래키를 ON DELETE SET NULL로 재생성한다.
-- 청구서 금액/상세는 invoice_items에 스냅샷되어 있으므로, 프라이스 항목을 영구삭제해도
-- 과거 청구서 데이터는 보존되고 참조만 NULL 처리되어 안전하다.
DO $$
DECLARE
  fk_name TEXT;
BEGIN
  SELECT conname INTO fk_name
  FROM pg_constraint
  WHERE conrelid = 'public.invoice_items'::regclass
    AND confrelid = 'public.price_items'::regclass
    AND contype = 'f';

  IF fk_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.invoice_items DROP CONSTRAINT %I', fk_name);
  END IF;
END $$;

ALTER TABLE public.invoice_items
  ADD CONSTRAINT invoice_items_price_item_id_fkey
  FOREIGN KEY (price_item_id) REFERENCES public.price_items(id) ON DELETE SET NULL;
