-- 청구서 상태에서 '확정(confirmed)' 단계 제거 → 작성중(draft) / 발송됨(sent) / 입금완료(paid) 3단계
-- 혹시 남아있는 confirmed 행은 작성중으로 정리한 뒤 CHECK 제약을 갱신한다.

UPDATE invoices SET status = 'draft' WHERE status = 'confirmed';

ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_status_check;
ALTER TABLE invoices ADD CONSTRAINT invoices_status_check
  CHECK (status IN ('draft', 'sent', 'paid'));
