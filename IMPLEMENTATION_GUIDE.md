# 프리즘필터 정산 시스템 구현 가이드

## ✅ 완료된 작업

### 1. 프로젝트 초기화
- ✅ Next.js 15 + React 19 + TypeScript 설정
- ✅ Tailwind CSS + shadcn/ui 설정
- ✅ 브랜드명: "프리즘필터 뮤직그룹"으로 통일
- ✅ PRISM FILTER 로고 SVG 컴포넌트 생성

### 2. 프로젝트 구조
```
src/
├── app/
│   ├── (auth)/
│   │   ├── login/              ← Google OAuth 로그인
│   │   ├── auth-code-error/    ← OAuth 에러 페이지
│   ├── (dashboard)/            ← 보호된 영역 (인증 필수)
│   │   ├── page.tsx            ← 대시보드 (데이터 바인딩 필요)
│   │   ├── settlement/         ← 정산 관리
│   │   ├── writers/            ← 작가 관리
│   │   ├── songs/              ← 곡 관리
│   │   └── admin/accounts/     ← 계정 관리
│   └── api/
│       └── auth/callback/      ← OAuth 콜백
├── components/
│   ├── layout/
│   │   ├── Sidebar.tsx         ← 사이드바 (로고 업데이트 ✅)
│   │   ├── Navbar.tsx          ← 네비바 (브랜드명 업데이트 ✅)
│   │   └── DashboardLayout.tsx
│   └── logo.tsx                ← 로고 컴포넌트
├── lib/
│   ├── supabase/
│   │   ├── client.ts           ← 클라이언트 설정 ✅
│   │   └── server.ts           ← 서버 설정 ✅
│   ├── settlement/
│   │   └── calculator.ts       ← 정산 계산 엔진 ✅
│   └── utils/
├── hooks/
│   └── useAuth.ts              ← 인증 상태 관리 ✅
├── store/
│   └── authStore.ts            ← Zustand 스토어 ✅
└── types/
    └── index.ts                ← 타입 정의 ✅
```

### 3. 생성된 파일

| 파일 | 설명 |
|------|------|
| `CLAUDE.md` | 개발 가이드 |
| `PRD.md` | 제품 요구사항 |
| `SUPABASE_SETUP.md` | Supabase 설정 가이드 |
| `supabase/migrations/001_init_schema.sql` | DB 스키마 |
| `.env.example` | 환경 변수 템플릿 |

---

## 🚀 다음 단계

### Step 1: Supabase 프로젝트 생성 (필수)

1. [https://app.supabase.com](https://app.supabase.com) 접속
2. 새 프로젝트 생성
3. `SUPABASE_SETUP.md` 문서 따라 설정
4. `.env.local` 파일 생성:
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=your_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key
   SUPABASE_SERVICE_ROLE_KEY=your_role_key
   ANTHROPIC_API_KEY=your_api_key
   NEXT_PUBLIC_SITE_URL=http://localhost:3000
   ```

### Step 2: 데이터베이스 스키마 적용

```sql
-- Supabase SQL Editor에서 실행
-- supabase/migrations/001_init_schema.sql 파일의 내용 복사
```

### Step 3: 개발 서버 실행

```bash
npm run dev
```

접속: http://localhost:3000/login

### Step 4: Google OAuth 테스트

1. Google 계정으로 로그인 시도
2. @prism-filter.com 이메일 필수
3. 로그인 성공 시 대시보드로 리다이렉트

---

## 📋 남은 작업 (Phase 2-5)

### Phase 2: 대시보드 데이터 바인딩
- [ ] 대시보드 페이지 - 실제 정산 데이터 조회
- [ ] 분기별 진행 상황 카드 - 실시간 업데이트
- [ ] 최근 정산 목록 - Supabase 데이터 표시

### Phase 3: 정산서 기능
- [ ] 정산 목록 페이지
- [ ] 새 정산 생성 폼 (React Hook Form)
- [ ] 실시간 자동 계산
- [ ] PDF 다운로드

### Phase 4: 관리 기능
- [ ] 작가 관리 (CRUD)
- [ ] 곡 관리 (KOMCA 코드)
- [ ] 계약 요율 설정
- [ ] 계정 권한 관리

### Phase 5: AI 기능
- [ ] AI 에이전트 - 엑셀 자동 정산
- [ ] AI 챗봇 - 맞춤 Q&A

---

## 🔑 주요 기능 구현

### 인증 (Google OAuth)
- ✅ 로그인 페이지
- ✅ Google OAuth 연동
- ✅ OAuth 콜백 처리
- ⏳ useAuth Hook (구현됨, 테스트 필요)
- ⏳ 권한 검증

### 데이터 바인딩
- ⏳ Supabase 쿼리 구현 필요:
  ```typescript
  // 예시 - 대시보드에서 사용
  const { data: batches } = await supabase
    .from('settlement_batches')
    .select('*')
    .order('created_at', { ascending: false });
  ```

### RLS (Row Level Security)
- ✅ SQL에서 정책 정의
- ⏳ 실제 테스트 필요
- ⏳ 권한별 접근 제어 검증

---

## 💾 환경 변수 설정 예시

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...

# Claude AI
ANTHROPIC_API_KEY=sk-ant-...

# App
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

---

## 🧪 테스트 체크리스트

- [ ] Google 로그인 작동 확인
- [ ] 로그인 후 대시보드 리다이렉트 확인
- [ ] 로그아웃 기능 확인
- [ ] 권한 검증 확인
  - [ ] ADMIN: 모든 메뉴 표시
  - [ ] STAFF: 할당된 메뉴만 표시
  - [ ] WRITER: 포털만 표시
- [ ] Supabase RLS 작동 확인
- [ ] 정산 계산 엔진 검증 (샘플 데이터)

---

## 📞 문제 해결

### 로그인 실패
1. `.env.local`에서 Supabase URL/Key 확인
2. Google OAuth 설정 확인
3. 이메일 도메인 화이트리스트 확인

### 데이터 조회 실패
1. Supabase RLS 정책 확인
2. 사용자 역할 설정 확인
3. 네트워크 요청 확인 (개발자 도구)

### 타입 에러
```bash
npm run build
# 또는
npx tsc --noEmit
```

---

## 📚 참고 자료

- [Next.js 공식 문서](https://nextjs.org/docs)
- [Supabase 공식 문서](https://supabase.com/docs)
- [shadcn/ui](https://ui.shadcn.com/)
- [Zustand](https://github.com/pmndrs/zustand)
- [React Hook Form](https://react-hook-form.com/)

---

## 🎯 현재 상태

✅ **프로젝트 초기화 완료**
- 기본 구조 및 컴포넌트 구축
- 로그인 시스템 준비
- Supabase 클라이언트 설정
- 계산 엔진 구현

⏳ **Supabase 연동 필요**
- 사용자가 직접 프로젝트 생성 필요
- 환경 변수 설정 필요
- DB 스키마 적용 필요

🚀 **다음 개발 우선순위**
1. Supabase 프로젝트 생성 & 스키마 적용
2. 대시보드 실제 데이터 연동
3. 정산서 입력 폼 구현
4. PDF 생성 기능

---

작성일: 2026-06-08
