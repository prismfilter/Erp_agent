-- 028_drop_music_works.sql
-- 구 저작물 모델(music_works: 작가별 1행·지분/요율) 폐기.
-- 신 모델 works + work_authors(026) + 시드(027) 적용 확인 후 실행.
-- 적용: Supabase 대시보드 SQL 편집기에서 1회 실행 (롤백 불가 — 순서 주의)

DROP TABLE IF EXISTS public.music_works;
