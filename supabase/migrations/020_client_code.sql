-- ============================================================================
-- 거래처 DB: 거래처 코드(client_code) 추가 (020_client_code.sql)
-- client_code: CL-001.. 고유 코드. 중복·수정 불가(앱 강제). 데이터 연동 식별자.
--   거래처 마스터(거래처 DB)에서만 노출. 작가 코드(writer_code, 019) 동일 패턴(단일 접두사).
-- 참조 패턴: 019_writer_code_and_contract_status.sql. 1회 실행 전제(UNIQUE는 멱등 아님).
-- ============================================================================

-- 1) client_code 컬럼 추가 (nullable로 추가 후 백필 → NOT NULL)
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS client_code VARCHAR(10);

-- 2) 기존 거래처 백필: created_at 오름차순으로 CL-001.. 순번 부여
WITH numbered AS (
  SELECT
    id,
    ROW_NUMBER() OVER (ORDER BY created_at ASC, id ASC) AS rn
  FROM public.clients
)
UPDATE public.clients c
SET client_code = 'CL-' || LPAD(n.rn::text, 3, '0')
FROM numbered n
WHERE c.id = n.id;

-- 3) NOT NULL + UNIQUE
ALTER TABLE public.clients
  ALTER COLUMN client_code SET NOT NULL;
ALTER TABLE public.clients
  ADD CONSTRAINT clients_client_code_unique UNIQUE (client_code);

COMMENT ON COLUMN public.clients.client_code IS '거래처 고유 코드 CL-001... 중복·수정 불가, 데이터 연동 식별자';
