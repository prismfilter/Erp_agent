-- ============================================================================
-- 010: 회사 입금계좌 정리 — 국민은행 제거, 신한은행을 기본 계좌로
-- ----------------------------------------------------------------------------
-- 청구서 폼에서 은행명·계좌번호를 직접 입력/등록하도록 바뀌면서 기본 계좌를
-- 신한은행(140-016-071366) 하나로 정리한다.
-- ============================================================================

-- 국민은행을 참조하는 청구서의 계좌 연결을 먼저 해제 (FK 제약 회피)
UPDATE public.invoices SET account_id = NULL
  WHERE account_id IN (SELECT id FROM public.company_accounts WHERE bank_name = '국민은행');

-- 국민은행 계좌 제거
DELETE FROM public.company_accounts WHERE bank_name = '국민은행';

-- 신한은행을 기본 계좌로, 나머지는 기본 해제
UPDATE public.company_accounts SET is_default = (bank_name = '신한은행');
