-- ============================================================================
-- 작가 마스터: 작가 코드(writer_code) + 계약 상태(status 재사용) (019_...)
-- writer_code: 전속 EX-001.., 일반 GN-001.. 고유 코드. 중복·수정 불가(앱 강제).
--   데이터 연동용 식별자. 작가 마스터에서만 노출, 저작물/청구서/정산서엔 백엔드 식별자(추후).
-- status: 기존 컬럼(DEFAULT 'active') 재사용 → 계약 상태. active=활성화, terminated=해지.
-- 참조 패턴: 011/017/018_writers_*. 1회 실행 전제(UNIQUE/CHECK는 멱등 아님).
-- ============================================================================

-- 1) writer_code 컬럼 추가 (nullable로 추가 후 백필 → NOT NULL)
ALTER TABLE public.writers
  ADD COLUMN IF NOT EXISTS writer_code VARCHAR(10);

-- 2) 기존 작가 백필: 구분별 created_at 오름차순으로 EX-/GN- 순번 부여
WITH numbered AS (
  SELECT
    id,
    CASE writer_type
      WHEN '전속작가' THEN 'EX'
      WHEN '일반작가' THEN 'GN'
    END AS prefix,
    ROW_NUMBER() OVER (
      PARTITION BY writer_type
      ORDER BY created_at ASC, id ASC
    ) AS rn
  FROM public.writers
)
UPDATE public.writers w
SET writer_code = n.prefix || '-' || LPAD(n.rn::text, 3, '0')
FROM numbered n
WHERE w.id = n.id
  AND n.prefix IS NOT NULL;

-- 3) NOT NULL + UNIQUE (구분이 전속/일반이 아닌 행이 있으면 이 단계에서 실패 → 데이터 점검 신호)
ALTER TABLE public.writers
  ALTER COLUMN writer_code SET NOT NULL;
ALTER TABLE public.writers
  ADD CONSTRAINT writers_writer_code_unique UNIQUE (writer_code);

COMMENT ON COLUMN public.writers.writer_code IS '작가 고유 코드 EX-001(전속)/GN-001(일반). 중복·수정 불가, 데이터 연동 식별자';

-- 4) status(계약 상태) 정규화 + 기본값/NOT NULL/CHECK. active=활성화(기본), terminated=해지
UPDATE public.writers
SET status = 'active'
WHERE status IS NULL OR status NOT IN ('active', 'terminated');

ALTER TABLE public.writers
  ALTER COLUMN status SET DEFAULT 'active';
ALTER TABLE public.writers
  ALTER COLUMN status SET NOT NULL;
ALTER TABLE public.writers
  ADD CONSTRAINT writers_status_check CHECK (status IN ('active', 'terminated'));

COMMENT ON COLUMN public.writers.status IS '계약 상태: active=활성화 | terminated=해지';
