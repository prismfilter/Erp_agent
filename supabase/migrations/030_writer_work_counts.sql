-- ============================================================================
-- 자사작가별 참여 작품수 집계 함수 (030)
-- 영구 저작물 DB 좌측 작가 패널용. writers.original_writer_code(KOMCA 원작자코드)가
-- work_authors.author_code로 등장하는 작품을 그 작가의 작업물로 집계한다.
--
-- 왜 함수(RPC)인가:
--   work_authors는 5천행 이상이라 클라이언트에서 .select()로 전부 읽으면
--   PostgREST 기본 응답 상한(db-max-rows=1000)에 걸려 일부만 읽혀 카운트가 누락된다.
--   집계를 DB 안에서 수행하면 5천행은 내부 처리되고 '작가별 집계 결과'(소수 행)만 반환되어
--   행 제한과 무관하게 정확하다.
--
-- 매칭키: author_code = original_writer_code (원작자코드 전용, 동명이인 안전).
-- 노출: 매칭 작품이 1개 이상(count > 0)인 작가만. 정렬: 작품수 내림차순, 이름.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.writer_work_counts()
RETURNS TABLE (writer_name text, count bigint)
LANGUAGE sql
STABLE
AS $$
  SELECT w.name AS writer_name, COUNT(DISTINCT wa.work_id) AS count
  FROM public.writers w
  JOIN public.work_authors wa ON wa.author_code = w.original_writer_code
  WHERE w.original_writer_code IS NOT NULL
  GROUP BY w.name
  HAVING COUNT(DISTINCT wa.work_id) > 0
  ORDER BY COUNT(DISTINCT wa.work_id) DESC, w.name;
$$;
