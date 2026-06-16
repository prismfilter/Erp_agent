-- ============================================================================
-- 인보이스(청구서) 기능 스키마 (007_invoice_schema.sql)
-- 거래처 청구서 + 내부 지급서 + 프라이스 테이블
-- ============================================================================

-- ── 프라이스 테이블 (마스터 단가) ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.price_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,                 -- 앨범 / 방송·공연·시상식 / 광고 / 기타 / 밴드 / 밴드(플레디스)
  name TEXT NOT NULL,                     -- 작업내역명
  billing_price BIGINT,                   -- 희망청구가 (수식형은 NULL)
  writer_base_pay BIGINT,                 -- 작가 지급액 방어선 (수식형은 NULL)
  fee_rate NUMERIC NOT NULL DEFAULT 0.20, -- 관리 수수료율
  is_formula BOOLEAN NOT NULL DEFAULT false,
  formula_note TEXT,                      -- 수식형 항목 설명
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── 거래처 ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── 회사 입금계좌 ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.company_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_name TEXT NOT NULL,
  account_number TEXT NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT false
);

-- ── 청구서 ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
  client_id UUID REFERENCES public.clients(id),
  title TEXT NOT NULL DEFAULT '',         -- 거래명
  account_id UUID REFERENCES public.company_accounts(id),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'confirmed', 'sent', 'paid')),
  memo TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── 청구서 라인 항목 ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  no INT NOT NULL DEFAULT 0,              -- 표시 순번
  price_item_id UUID REFERENCES public.price_items(id),  -- 커스텀 항목은 NULL
  description TEXT NOT NULL DEFAULT '',   -- 상세내용
  writer_names TEXT NOT NULL DEFAULT '',  -- 작업자 실명 (콤마 구분 복수)
  supply_amount BIGINT NOT NULL DEFAULT 0,-- 공급가액 (스냅샷, 할인 행은 음수)
  writer_pay BIGINT NOT NULL DEFAULT 0,   -- 작가 지급액 (스냅샷)
  item_type TEXT NOT NULL DEFAULT 'normal' CHECK (item_type IN ('normal', 'discount', 'custom')),
  is_negotiated BOOLEAN NOT NULL DEFAULT false,
  note TEXT,                              -- 내부 비고 (내부 지급서에만 표시)
  show_in_external BOOLEAN NOT NULL DEFAULT true,
  group_key UUID,                         -- 내부 행 분리 시 부모 invoice_item id
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON public.invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoices_client ON public.invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_date ON public.invoices(invoice_date);
CREATE INDEX IF NOT EXISTS idx_price_items_category ON public.price_items(category, sort_order);

-- ── RLS: ADMIN/STAFF만 접근 (작가는 내부 단가·지급액 열람 불가) ────────────────
ALTER TABLE public.price_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['price_items', 'clients', 'company_accounts', 'invoices', 'invoice_items']
  LOOP
    EXECUTE format($f$
      CREATE POLICY staff_all_%1$s ON public.%1$s FOR ALL
        USING (
          EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_id = auth.uid() AND role IN ('ADMIN', 'STAFF')
          )
        )
    $f$, t);
  END LOOP;
END $$;

-- ============================================================================
-- 시드 데이터
-- ============================================================================

-- ── 회사 계좌 ────────────────────────────────────────────────────────────────
INSERT INTO public.company_accounts (bank_name, account_number, is_default) VALUES
  ('국민은행', '818537-04-006155', true),
  ('신한은행', '140-016-071366', false);

-- ── 거래처 (실데이터 기준) ────────────────────────────────────────────────────
INSERT INTO public.clients (name) VALUES
  ('플레디스'),
  ('젤리피쉬엔터테인먼트'),
  ('LABEL SJ');

-- ── 프라이스 테이블 (2025년 개편안 전체) ─────────────────────────────────────
INSERT INTO public.price_items (category, name, billing_price, writer_base_pay, is_formula, formula_note, sort_order) VALUES
  -- 앨범
  ('앨범', '메인 보컬 튠', 250000, 150000, false, NULL, 1),
  ('앨범', '덥코 튠', 250000, 150000, false, NULL, 2),
  ('앨범', '메인 보컬+코러스(더빙포함) 튠', 400000, 300000, false, NULL, 3),
  ('앨범', '트랙비 (악기세션 포함)', 7000000, 5000000, false, NULL, 4),
  ('앨범', '곡비 (바이아웃)', NULL, NULL, true, '청구가 공개 / 작가지급액 = (총 금액 - 실비) × 60%', 5),
  ('앨범', 'OST 곡비', 3000000, 2000000, false, NULL, 6),
  ('앨범', '믹스 (튠 미포함)', 1400000, 1000000, false, NULL, 7),
  ('앨범', '보컬믹스 (발매 O)', 800000, 600000, false, NULL, 8),
  ('앨범', '악기세션 (곡별)', 400000, 300000, false, NULL, 9),
  ('앨범', '리얼 스트링편곡', 1300000, 1000000, false, NULL, 10),
  ('앨범', '미디 스트링편곡', 1000000, 600000, false, NULL, 11),
  ('앨범', '가이드보컬', 400000, 300000, false, NULL, 12),
  ('앨범', '코러스', 400000, 300000, false, NULL, 13),
  ('앨범', '보컬 디렉팅 (1곡 기준)', 1000000, 800000, false, NULL, 14),
  ('앨범', '보컬 용역 묶음 (가이드+코러스+디렉팅)', 1500000, 1200000, false, NULL, 15),
  ('앨범', '티저음원 (30초 당/캡2분)', 300000, 200000, false, NULL, 16),
  ('앨범', '티저음원 믹스', 400000, 250000, false, NULL, 17),
  ('앨범', '트레일러 (순수창작, 30초당/캡2분)', 400000, 300000, false, NULL, 18),
  ('앨범', '폴리', 150000, 100000, false, NULL, 19),
  ('앨범', '하이라이트 메들리 (창작)', 150000, 100000, false, NULL, 20),
  ('앨범', '음원편집', 0, 0, false, NULL, 21),
  -- 방송·공연·시상식
  ('방송·공연·시상식', '메인 보컬 튠', 250000, 150000, false, NULL, 1),
  ('방송·공연·시상식', '덥코 튠', 250000, 150000, false, NULL, 2),
  ('방송·공연·시상식', '메인 보컬+코러스(더빙포함) 튠', 400000, 300000, false, NULL, 3),
  ('방송·공연·시상식', '믹스 (튠 미포함)', 900000, 600000, false, NULL, 4),
  ('방송·공연·시상식', 'Live AR, 인스트 믹스, 보컬믹스 제작', 600000, 400000, false, NULL, 5),
  ('방송·공연·시상식', '커버곡 인스트 제작', 400000, 250000, false, NULL, 6),
  ('방송·공연·시상식', 'VCR&인트로&연결음악&ACCA (30초 미만)', 300000, 300000, false, NULL, 7),
  ('방송·공연·시상식', 'VCR&인트로&연결음악&ACCA (30초 ~ 1분 미만)', 600000, 500000, false, NULL, 8),
  ('방송·공연·시상식', 'VCR&인트로&연결음악&ACCA (1분 이상)', 1000000, 800000, false, NULL, 9),
  ('방송·공연·시상식', '1절분량편곡(세션별도)', 2000000, 1000000, false, NULL, 10),
  ('방송·공연·시상식', '완곡분량편곡(세션별도)', 3000000, 1500000, false, NULL, 11),
  ('방송·공연·시상식', '악기세션 (곡별)', 350000, 300000, false, NULL, 12),
  ('방송·공연·시상식', '스트링편곡 (별도진행시에만 적용)', 1000000, 600000, false, NULL, 13),
  ('방송·공연·시상식', '가이드보컬', 350000, 300000, false, NULL, 14),
  ('방송·공연·시상식', '코러스', 350000, 300000, false, NULL, 15),
  ('방송·공연·시상식', '보컬 디렉팅 (1곡 기준)', 500000, 300000, false, NULL, 16),
  ('방송·공연·시상식', 'VCR 음원(1분 미만)', 500000, 400000, false, NULL, 17),
  ('방송·공연·시상식', 'VCR 음원(1분 ~ 2분)', 1000000, 800000, false, NULL, 18),
  ('방송·공연·시상식', 'VCR 음원(2분 이상)', 1500000, 1000000, false, NULL, 19),
  ('방송·공연·시상식', '폴리', 150000, 100000, false, NULL, 20),
  ('방송·공연·시상식', '음원편집', 0, 0, false, NULL, 21),
  -- 광고
  ('광고', '메인 보컬 튠', 250000, 200000, false, NULL, 1),
  ('광고', '메인 보컬+코러스 튠', 400000, 300000, false, NULL, 2),
  ('광고', '곡비 (바이아웃)', NULL, NULL, true, '청구가 공개 (협의 후 책정)', 3),
  ('광고', '믹스', 1400000, 1000000, false, NULL, 4),
  ('광고', '악기세션', 400000, 300000, false, NULL, 5),
  -- 기타
  ('기타', '레슨 1회당 (시간당)', 100000, 100000, false, NULL, 1),
  ('기타', '악보 채보비 (곡별)', 50000, 50000, false, NULL, 2),
  ('기타', '컨텐츠/광고 플레이백', 300000, 300000, false, NULL, 3),
  ('기타', '행사/페스티벌 플레이백', 400000, 400000, false, NULL, 4),
  ('기타', '위문열차 플레이백', 500000, 500000, false, NULL, 5),
  ('기타', '콘서트 플레이백', 800000, 800000, false, NULL, 6),
  ('기타', '레코딩 오퍼레이팅 (1프로당)', 250000, 250000, false, NULL, 7),
  -- 밴드(플레디스)
  ('밴드(플레디스)', '콘서트 밴드 마스터 [2만석 이상]', 3500000, 3500000, false, NULL, 1),
  ('밴드(플레디스)', '콘서트 밴드 구성원 [2만석 이상]', 3000000, 3000000, false, NULL, 2),
  ('밴드(플레디스)', '콘서트 밴드 마스터 [2만석 미만]', 2500000, 2500000, false, NULL, 3),
  ('밴드(플레디스)', '콘서트 밴드 구성원 [2만석 미만]', 2000000, 2000000, false, NULL, 4),
  ('밴드(플레디스)', '팬미팅 밴드 마스터 [규모/국내외 무관]', 1700000, 1700000, false, NULL, 5),
  ('밴드(플레디스)', '팬미팅 밴드 구성원 [규모/국내외 무관]', 1400000, 1400000, false, NULL, 6),
  ('밴드(플레디스)', '행사 밴드 마스터 [20곡 이상]', 3500000, 3500000, false, NULL, 7),
  ('밴드(플레디스)', '행사 밴드 구성원 [20곡 이상]', 3000000, 3000000, false, NULL, 8),
  ('밴드(플레디스)', '행사 밴드 마스터 [10~19곡]', 2500000, 2500000, false, NULL, 9),
  ('밴드(플레디스)', '행사 밴드 구성원 [10~19곡]', 2000000, 2000000, false, NULL, 10),
  ('밴드(플레디스)', '행사 밴드 마스터 [1~9곡]', 1500000, 1500000, false, NULL, 11),
  ('밴드(플레디스)', '행사 밴드 구성원 [1~9곡]', 1000000, 1000000, false, NULL, 12),
  ('밴드(플레디스)', '라이브클립 밴드 마스터', 1500000, 1500000, false, NULL, 13),
  ('밴드(플레디스)', '라이브클립 밴드 구성원', 1300000, 1300000, false, NULL, 14),
  ('밴드(플레디스)', '밴드 영화관 상영 / DVD / 녹음 등 영상 저작물', NULL, NULL, true, '별도 협의', 15),
  ('밴드(플레디스)', '밴드 녹음 (리허설 용도 외 수익창출 목적물)', NULL, NULL, true, '별도 협의', 16),
  -- 밴드
  ('밴드', '콘서트 밴드 마스터 [2만석 이상]', 2800000, 2800000, false, NULL, 1),
  ('밴드', '콘서트 밴드 구성원 [2만석 이상]', 2500000, 2500000, false, NULL, 2),
  ('밴드', '콘서트 밴드 마스터 [2만석 미만]', 2300000, 2300000, false, NULL, 3),
  ('밴드', '콘서트 밴드 구성원 [2만석 미만]', 1800000, 1800000, false, NULL, 4),
  ('밴드', '국내 팬미팅 밴드 마스터 [규모무관]', 1000000, 1000000, false, NULL, 5),
  ('밴드', '국내 팬미팅 밴드 구성원 [규모무관]', 1000000, 1000000, false, NULL, 6),
  ('밴드', '국외 팬미팅 밴드 마스터 [규모무관]', 1500000, 1500000, false, NULL, 7),
  ('밴드', '국외 팬미팅 밴드 구성원 [규모무관]', 1500000, 1500000, false, NULL, 8),
  ('밴드', '행사 밴드 마스터 [20곡 이상]', 3500000, 3500000, false, NULL, 9),
  ('밴드', '행사 밴드 구성원 [20곡 이상]', 3000000, 3000000, false, NULL, 10),
  ('밴드', '행사 밴드 마스터 [10~19곡]', 2300000, 2300000, false, NULL, 11),
  ('밴드', '행사 밴드 구성원 [10~19곡]', 1800000, 1800000, false, NULL, 12),
  ('밴드', '행사 밴드 마스터 [1~9곡]', 1000000, 1000000, false, NULL, 13),
  ('밴드', '행사 밴드 구성원 [1~9곡]', 1000000, 1000000, false, NULL, 14),
  ('밴드', '라이브클립 밴드 마스터', 1000000, 1000000, false, NULL, 15),
  ('밴드', '라이브클립 밴드 구성원', 800000, 800000, false, NULL, 16),
  ('밴드', '밴드 영화관 상영 / DVD / 녹음 등 영상 저작물', NULL, NULL, true, '별도 협의', 17),
  ('밴드', '밴드 녹음 (리허설 용도 외 수익창출 목적물)', NULL, NULL, true, '별도 협의', 18);
