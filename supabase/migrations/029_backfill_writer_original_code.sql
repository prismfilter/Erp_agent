-- 029_backfill_writer_original_code.sql
-- 자사작가 KOMCA 원작자코드 초기 백필.
-- 컬럼은 025_writer_detail_fields.sql의 writers.original_writer_code("원작자 코드")를 재사용한다.
-- '영구 저작물 DB' 좌측 자사작가 사이드바가 이 코드로 work_authors.author_code를 매칭한다.
-- (자사작가의 KOMCA 등록명은 실명과 다름: 예) 전진욱=징고, 배성연=SHANNON BAE)
-- 작가 마스터 상세 페이지에서 ADMIN이 입력/수정. 아래 6명은 옛 DB 교차분석으로 도출한 초기값.
-- 적용: Supabase 대시보드 SQL 편집기에서 1회 실행 (기존 입력값은 보존: IS NULL일 때만 백필)

UPDATE public.writers SET original_writer_code = '10008635' WHERE name = '김경환' AND original_writer_code IS NULL;
UPDATE public.writers SET original_writer_code = '10006811' WHERE name = '김관영' AND original_writer_code IS NULL;
UPDATE public.writers SET original_writer_code = '10012729' WHERE name = '배성연' AND original_writer_code IS NULL;
UPDATE public.writers SET original_writer_code = '10011984' WHERE name = '이교창' AND original_writer_code IS NULL;
UPDATE public.writers SET original_writer_code = '10022926' WHERE name = '이승필' AND original_writer_code IS NULL;
UPDATE public.writers SET original_writer_code = 'W0636800' WHERE name = '전진욱' AND original_writer_code IS NULL;
