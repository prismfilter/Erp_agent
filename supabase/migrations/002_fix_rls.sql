-- ============================================================================
-- Supabase RLS 정책 수정 (002_fix_rls.sql)
-- 목적: user_roles/user_permissions 테이블 SELECT 정책 추가
--       writers 테이블 인증된 사용자 조회 허용
-- ============================================================================

-- user_roles: 자신의 역할 조회 허용
CREATE POLICY "자신의 역할 조회" ON user_roles
  FOR SELECT USING (user_id = auth.uid());

-- user_permissions: 자신의 권한 조회 허용
CREATE POLICY "자신의 권한 조회" ON user_permissions
  FOR SELECT USING (user_id = auth.uid());

-- writers: 인증된 모든 사용자 조회 허용
CREATE POLICY "인증된 사용자 작가 조회" ON writers
  FOR SELECT USING (auth.role() = 'authenticated');

-- writers: ADMIN만 INSERT/UPDATE/DELETE
CREATE POLICY "ADMIN 작가 편집" ON writers
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'ADMIN'
    )
  );

-- ============================================================================
-- 실행 방법:
-- 1. Supabase 대시보드 → SQL Editor
-- 2. 위 쿼리를 복사 붙여넣기
-- 3. [Run] 버튼 클릭
-- ============================================================================
