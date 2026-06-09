# Supabase 설정 가이드

## 1단계: Supabase 프로젝트 생성

1. [Supabase Dashboard](https://app.supabase.com)에 접속
2. "New Project" 클릭
3. 프로젝트 이름: `prism-filter`
4. 지역: `Asia Pacific (Singapore)` 또는 가까운 지역 선택
5. 데이터베이스 암호 설정 및 생성

## 2단계: 환경 변수 설정

프로젝트 설정(Settings) → API에서:
- `NEXT_PUBLIC_SUPABASE_URL` 복사
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` 복사

`.env.local` 파일 생성:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
ANTHROPIC_API_KEY=your-api-key
```

## 3단계: 데이터베이스 스키마 적용

1. Supabase 대시보드 → SQL Editor
2. "New Query" 클릭
3. `supabase/migrations/001_init_schema.sql` 파일의 내용 복사
4. SQL을 실행

또는 Supabase CLI 사용:
```bash
npm install -g supabase
supabase db push
```

## 4단계: Google OAuth 설정

1. **Google Cloud Console에서**
   - https://console.cloud.google.com 접속
   - OAuth 2.0 클라이언트 ID 생성 (웹 애플리케이션)
   - 승인된 리다이렉트 URI 추가:
     ```
     https://your-project.supabase.co/auth/v1/callback
     ```

2. **Supabase에서**
   - Authentication → Providers → Google
   - Google Client ID와 Secret 입력
   - Enable 클릭

3. **이메일 도메인 제한**
   - Authentication → Settings → Email Domain Whitelist
   - `@prism-filter.com` 추가

## 5단계: 샘플 데이터 추가 (선택사항)

Supabase SQL Editor에서:
```sql
INSERT INTO writers (name, birth_date, bank_account, writer_type, email, status)
VALUES
  ('홍길동', '1985-01-15', '국민은행 123-456-789', '작곡가', 'hong@prism-filter.com', 'active'),
  ('이순신', '1990-03-20', '우리은행 987-654-321', '작사가', 'lee@prism-filter.com', 'active');

INSERT INTO writer_contracts (writer_id, work_type, company_rate, contract_date)
SELECT id, '영구저작물', 35, '2026-01-01' FROM writers WHERE name = '홍길동'
UNION ALL
SELECT id, '일반저작물', 30, '2026-01-01' FROM writers WHERE name = '홍길동'
UNION ALL
SELECT id, '영구저작물', 25, '2026-01-01' FROM writers WHERE name = '이순신'
UNION ALL
SELECT id, '일반저작물', 25, '2026-01-01' FROM writers WHERE name = '이순신';
```

## 6단계: 테스트

```bash
npm run dev
```

브라우저에서 `http://localhost:3000/login` 접속 후 Google 로그인 테스트

## 주의사항

- **RLS (Row Level Security)**: 모든 테이블에 적용됨
  - ADMIN: 모든 데이터 접근 가능
  - WRITER: 자신의 정산서만 조회 가능
  - STAFF: 관리자가 부여한 권한에 따라 접근

- **감시 추적**: 모든 작업이 `audit_logs` 테이블에 기록됨

- **데이터 백업**: 정기적으로 Supabase 대시보드에서 백업 설정

## 문제 해결

### "Cannot find module @supabase/ssr"
```bash
npm install @supabase/ssr
```

### Google OAuth 로그인 실패
- 승인된 리다이렉트 URI가 정확한지 확인
- 이메일 도메인이 `@prism-filter.com`인지 확인
- 클라이언트 ID/Secret이 올바른지 확인

### RLS 권한 오류
- Supabase 대시보드 → Authentication → Policies에서 정책 확인
- 테이블별 RLS 정책이 활성화되어 있는지 확인

## 참고 자료

- [Supabase 공식 문서](https://supabase.com/docs)
- [Supabase Next.js Auth](https://supabase.com/docs/guides/auth/social-oauth/auth-google)
- [RLS 정책](https://supabase.com/docs/guides/auth/row-level-security)
