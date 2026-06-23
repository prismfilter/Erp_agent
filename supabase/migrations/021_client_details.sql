-- ============================================================================
-- 거래처 DB: 상세정보 컬럼 추가 (021_client_details.sql)
-- 상세 페이지(기본/담당/은행 섹션)용 필드. 전부 nullable → 기존 거래처는 미입력 상태.
-- 참조 패턴: 020_client_code.sql.
-- ============================================================================

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS representative   TEXT,  -- 대표자
  ADD COLUMN IF NOT EXISTS business_number  TEXT,  -- 사업자 등록번호
  ADD COLUMN IF NOT EXISTS address          TEXT,  -- 주소
  ADD COLUMN IF NOT EXISTS manager_name     TEXT,  -- 담당자
  ADD COLUMN IF NOT EXISTS contact_phone    TEXT,  -- 연락처
  ADD COLUMN IF NOT EXISTS contact_email    TEXT,  -- 이메일
  ADD COLUMN IF NOT EXISTS department_title TEXT,  -- 부서 / 직함
  ADD COLUMN IF NOT EXISTS bank_name        TEXT,  -- 은행명
  ADD COLUMN IF NOT EXISTS account_number   TEXT,  -- 계좌번호
  ADD COLUMN IF NOT EXISTS account_holder   TEXT;  -- 예금주

COMMENT ON COLUMN public.clients.representative   IS '대표자';
COMMENT ON COLUMN public.clients.business_number  IS '사업자 등록번호';
COMMENT ON COLUMN public.clients.address          IS '주소';
COMMENT ON COLUMN public.clients.manager_name     IS '담당자';
COMMENT ON COLUMN public.clients.contact_phone    IS '연락처';
COMMENT ON COLUMN public.clients.contact_email    IS '이메일';
COMMENT ON COLUMN public.clients.department_title IS '부서 / 직함';
COMMENT ON COLUMN public.clients.bank_name        IS '은행명';
COMMENT ON COLUMN public.clients.account_number   IS '계좌번호';
COMMENT ON COLUMN public.clients.account_holder   IS '예금주';
