-- 026_works_schema.sql
-- 출판사 관리 저작물 DB (works + work_authors) — 신 데이터 모델
-- 한 저작물(works) ↔ 원작자 다건(work_authors). '영구 저작물 DB' 페이지가 사용.
-- 기존 music_works(작가별 1행·지분/요율) 모델을 대체. 시드는 027, music_works 폐기는 028.
-- 참조 패턴: 016_music_works.sql (RLS staff_all)
-- 적용: Supabase 대시보드 SQL 편집기에서 1회 실행

-- 저작물(작품 단위, 저작물코드로 유일)
CREATE TABLE IF NOT EXISTS public.works (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  no INT NOT NULL UNIQUE,                 -- 순번(작품 단위 1..N), 중복 입력 불가
  komca_code TEXT NOT NULL UNIQUE,        -- 저작물코드(KOMCA) — 작품 식별자
  song_title TEXT NOT NULL,               -- 저작물명(곡명)
  song_title_en TEXT,                     -- 영문저작물명
  artist TEXT,                            -- 가수명(아티스트)
  artist_en TEXT,                         -- 영문가수명
  publish_date DATE,                      -- 공표일자
  iswc TEXT,                              -- ISWC
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 원작자(작품당 N행) — 작가구분/공연권/복제권 보유
CREATE TABLE IF NOT EXISTS public.work_authors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_id UUID NOT NULL REFERENCES public.works(id) ON DELETE CASCADE,
  role TEXT CHECK (role IN ('A', 'C', 'AR')),  -- 작가구분 A=작곡 / C=작사 / AR=편곡
  author_code TEXT,                            -- 원작자코드(KOMCA)
  author_name TEXT,                            -- 원작자명
  author_name_en TEXT,                         -- 원작자영문명
  performance_right NUMERIC,                   -- 공연권(%)
  reproduction_right NUMERIC,                  -- 복제권(%)
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_works_no ON public.works(no);
CREATE INDEX IF NOT EXISTS idx_work_authors_work ON public.work_authors(work_id);
-- 사이드바(자사작가 KOMCA 코드 매칭)·필터에 사용
CREATE INDEX IF NOT EXISTS idx_work_authors_code ON public.work_authors(author_code);

ALTER TABLE public.works ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_authors ENABLE ROW LEVEL SECURITY;

-- ADMIN/STAFF 접근 (WRITER 차단). 변경의 ADMIN 한정은 API(requireStaff(true))에서 강제 — 016 동일 패턴
DROP POLICY IF EXISTS staff_all_works ON public.works;
CREATE POLICY staff_all_works ON public.works FOR ALL
  USING     (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('ADMIN', 'STAFF')))
  WITH CHECK(EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('ADMIN', 'STAFF')));

DROP POLICY IF EXISTS staff_all_work_authors ON public.work_authors;
CREATE POLICY staff_all_work_authors ON public.work_authors FOR ALL
  USING     (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('ADMIN', 'STAFF')))
  WITH CHECK(EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('ADMIN', 'STAFF')));
