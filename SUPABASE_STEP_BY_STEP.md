# Supabase 단계별 설정 가이드

## 📋 목차
1. [Step 1: 프로젝트 정보 수집](#step-1-프로젝트-정보-수집)
2. [Step 2: 환경 변수 설정](#step-2-환경-변수-설정)
3. [Step 3: 데이터베이스 스키마 적용](#step-3-데이터베이스-스키마-적용)
4. [Step 4: Google OAuth 설정](#step-4-google-oauth-설정)
5. [Step 5: 샘플 데이터 추가](#step-5-샘플-데이터-추가)
6. [Step 6: 테스트](#step-6-테스트)

---

## Step 1: 프로젝트 정보 수집

### 1-1. Supabase Dashboard 접속
```
https://app.supabase.com/projects
```

### 1-2. 생성한 프로젝트 클릭

### 1-3. 프로젝트 설정에서 API 정보 복사

**Settings → API** 탭으로 이동

필요한 정보:
- ✅ **Project URL** (프로젝트 링크)
- ✅ **anon public key** (익명 공개 키)
- ✅ **service_role secret** (서비스 역할 비밀키)

**스크린샷 예시:**
```
Settings → API
┌─────────────────────────────────────┐
│ Project URL                         │
│ https://[project-id].supabase.co   │
│ [복사 버튼]                          │
│                                     │
│ anon public                        │
│ eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXV│
│ [복사 버튼]                          │
│                                     │
│ service_role secret                │
│ eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXV│
│ [복사 버튼]                          │
└─────────────────────────────────────┘
```

---

## Step 2: 환경 변수 설정

### 2-1. `.env.local` 파일 열기

```
C:\Users\USER\workspace\Prism-filter\prism-agent\.env.local
```

### 2-2. 현재 내용 확인

```env
# Supabase (개발 테스트용 - 실제 값으로 교체 필요)
NEXT_PUBLIC_SUPABASE_URL=https://placeholder.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsYWNlaG9sZGVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE2MDA3NDEwMDAsImV4cCI6MTYzMjI3NzAwMH0.placeholder

# 개발 환경
NEXT_PUBLIC_SITE_URL=http://localhost:3001

# Claude AI (선택사항)
ANTHROPIC_API_KEY=sk-ant-placeholder-for-testing
```

### 2-3. 실제 값으로 교체

다음 부분을 Supabase에서 복사한 값으로 교체:

**before:**
```env
NEXT_PUBLIC_SUPABASE_URL=https://placeholder.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**after (예시):**
```env
NEXT_PUBLIC_SUPABASE_URL=https://abc123def456.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiYzEyM2RlZjQ1NiIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNjAwNzQxMDAwLCJleHAiOjE2MzIyNzcwMDB9.ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijk
```

### 2-4. SUPABASE_SERVICE_ROLE_KEY 추가

파일 아래에 다음을 추가:
```env
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**최종 .env.local 파일:**
```env
# Supabase (실제 값)
NEXT_PUBLIC_SUPABASE_URL=https://[project-id].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[anon-key]
SUPABASE_SERVICE_ROLE_KEY=[service-role-key]

# 개발 환경
NEXT_PUBLIC_SITE_URL=http://localhost:3001

# Claude AI (선택사항)
ANTHROPIC_API_KEY=sk-ant-...
```

### ⚠️ 주의사항
- 절대 이 키들을 GitHub에 커밋하지 마세요
- `.gitignore`에 `.env.local`이 포함되어 있는지 확인하세요

---

## Step 3: 데이터베이스 스키마 적용

### 3-1. Supabase Dashboard 접속
```
프로젝트 → SQL Editor
```

### 3-2. "New Query" 클릭

### 3-3. 스키마 파일 복사

`supabase/migrations/001_init_schema.sql` 파일의 전체 내용 복사

### 3-4. SQL Editor에 붙여넣기

```sql
-- 전속작가 테이블
CREATE TABLE writers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  birth_date DATE,
  ...
)

-- (계속...)
```

### 3-5. "Run" 버튼 클릭

✅ 성공 메시지 표시 확인

---

## Step 4: Google OAuth 설정

### 4-1. Google Cloud Console 접속
```
https://console.cloud.google.com
```

### 4-2. 새 프로젝트 생성 (또는 기존 프로젝트 사용)

### 4-3. OAuth 2.0 클라이언트 ID 생성

**경로:**
```
Credentials (자격증명) → Create Credentials → OAuth 2.0 Client ID
```

**설정:**
- Application type: **Web application**
- Name: `PRISM FILTER`

### 4-4. 리다이렉트 URI 추가

**Authorized redirect URIs:**
```
https://[project-id].supabase.co/auth/v1/callback
```

예시:
```
https://abc123def456.supabase.co/auth/v1/callback
```

### 4-5. Client ID와 Secret 복사

### 4-6. Supabase에서 Google OAuth 설정

**경로:**
```
Supabase Dashboard → Authentication → Providers → Google
```

**입력:**
- Enabled: **ON** ✓
- Client ID: [Google에서 복사한 Client ID]
- Client Secret: [Google에서 복사한 Secret]

### 4-7. 이메일 도메인 제한 설정

**경로:**
```
Authentication → Settings → Email Domain Whitelist
```

**추가:**
```
@prism-filter.com
```

---

## Step 5: 샘플 데이터 추가 (선택사항)

### 5-1. Supabase SQL Editor에서 새 쿼리 생성

### 5-2. 샘플 데이터 입력

```sql
-- 샘플 작가 추가
INSERT INTO writers (name, birth_date, bank_account, writer_type, email, status)
VALUES
  ('홍길동', '1985-01-15', '국민은행 123-456-789', '작곡가', 'hong@prism-filter.com', 'active'),
  ('이순신', '1990-03-20', '우리은행 987-654-321', '작사가', 'lee@prism-filter.com', 'active'),
  ('김영희', '1992-07-10', '신한은행 111-222-333', '탑라이너', 'kim@prism-filter.com', 'active');

-- 샘플 계약 요율 추가
INSERT INTO writer_contracts (writer_id, work_type, company_rate, contract_date)
SELECT id, '영구저작물', 35, '2026-01-01' FROM writers WHERE name = '홍길동'
UNION ALL
SELECT id, '일반저작물', 30, '2026-01-01' FROM writers WHERE name = '홍길동'
UNION ALL
SELECT id, '영구저작물', 25, '2026-01-01' FROM writers WHERE name = '이순신'
UNION ALL
SELECT id, '일반저작물', 25, '2026-01-01' FROM writers WHERE name = '이순신'
UNION ALL
SELECT id, '영구저작물', 30, '2026-01-01' FROM writers WHERE name = '김영희'
UNION ALL
SELECT id, '일반저작물', 28, '2026-01-01' FROM writers WHERE name = '김영희';

-- 샘플 곡 추가
INSERT INTO songs (komca_code, title, artist_name, writer_id, work_type, domestic_share, overseas_share)
SELECT 'KOMCA001', '사랑', '아이유', id, '영구저작물', 100, 0 FROM writers WHERE name = '홍길동'
UNION ALL
SELECT 'KOMCA002', '추억', 'BTS', id, '일반저작물', 100, 0 FROM writers WHERE name = '홍길동'
UNION ALL
SELECT 'KOMCA003', '겨울', '세븐틴', id, '영구저작물', 100, 0 FROM writers WHERE name = '이순신'
UNION ALL
SELECT 'KOMCA004', '봄날', '에스파', id, '일반저작물', 100, 0 FROM writers WHERE name = '김영희';
```

### 5-3. "Run" 실행

---

## Step 6: 테스트

### 6-1. 개발 서버 재시작

개발 서버 종료 후 다시 시작:
```bash
npm run dev
```

### 6-2. 로그인 페이지 접속

```
http://localhost:3001/login
```

### 6-3. 환경 변수 확인

✅ 환경 변수 설정 경고 메시지가 사라져야 함

### 6-4. Google 로그인 테스트

1. "Google 계정으로 로그인" 클릭
2. Google 계정 선택
3. @prism-filter.com 이메일로 로그인
4. 권한 승인

### 6-5. 대시보드 접속 확인

✅ 로그인 후 대시보드로 리다이렉트 확인

---

## ✅ 완료 체크리스트

```
Step 1: 프로젝트 정보 수집
☐ Project URL 복사
☐ anon public key 복사
☐ service_role secret 복사

Step 2: 환경 변수 설정
☐ .env.local 파일 수정
☐ NEXT_PUBLIC_SUPABASE_URL 입력
☐ NEXT_PUBLIC_SUPABASE_ANON_KEY 입력
☐ SUPABASE_SERVICE_ROLE_KEY 입력

Step 3: 데이터베이스 스키마 적용
☐ SQL 쿼리 실행
☐ 테이블 생성 확인

Step 4: Google OAuth 설정
☐ Google Client ID 생성
☐ Client Secret 복사
☐ Supabase에 입력
☐ 이메일 도메인 화이트리스트 추가

Step 5: 샘플 데이터 추가
☐ 작가 데이터 입력
☐ 계약 요율 입력
☐ 곡 데이터 입력

Step 6: 테스트
☐ 개발 서버 시작
☐ 로그인 페이지 접속
☐ Google 로그인 테스트
☐ 대시보드 확인
```

---

## 🆘 문제 해결

### 환경 변수 경고가 여전히 표시됨

**해결책:**
1. `.env.local` 파일이 올바르게 저장되었는지 확인
2. 개발 서버를 완전히 재시작
3. 브라우저 캐시 삭제 (Ctrl+Shift+Delete)

### Google 로그인 실패

**확인사항:**
1. Client ID/Secret이 정확한지 확인
2. 리다이렉트 URI가 정확한지 확인
3. `@prism-filter.com` 이메일로 로그인했는지 확인

### "No user found" 오류

**확인사항:**
1. RLS 정책이 활성화되어 있는지 확인
2. user_roles 테이블에 사용자 역할이 생성되었는지 확인

```sql
SELECT * FROM user_roles WHERE user_id = 'your-user-id';
```

### 데이터베이스 쿼리 오류

**해결책:**
1. SQL 구문 오류 확인
2. 테이블 이름 및 컬럼명 확인
3. 스키마 파일이 완전히 복사되었는지 확인

---

## 📞 다음 단계

설정 완료 후:

1. ✅ 작가 관리 페이지 구현
2. ✅ 곡 관리 페이지 구현
3. ✅ 정산서 입력 폼 구현
4. ✅ 실시간 데이터 바인딩
5. ✅ PDF 다운로드 기능

---

**작성일**: 2026-06-08  
**상태**: Supabase 설정 준비 완료
