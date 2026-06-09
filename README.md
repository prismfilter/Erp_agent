# 🎵 PRISM FILTER ERP - 전속작가 정산 자동화 시스템

**프리즘필터 뮤직그룹의 음악 저작권 정산을 자동화하는 웹 기반 ERP 시스템**

---

## 📋 프로젝트 개요

### 목표
음악 저작권 정산 업무를 **수동 처리(4시간 소요, 2-3% 오류)에서 웹 기반 자동화로 전환**

### 대상
- **전속작가:** 5명
- **관리 저작물:** 164곡
- **적용 시기:** 2026년 2분기(4월)

### 주요 기능
- ✅ 자동 정산 계산 (세금, 수수료 포함)
- ✅ Google OAuth 기반 인증
- ✅ 역할별 대시보드 (관리자/직원/작가)
- ✅ Excel 업로드 & 처리
- ✅ PDF 정산서 자동 생성
- ✅ 실시간 정산 현황 모니터링

---

## 🛠️ 기술 스택

### Frontend
| 기술 | 버전 | 용도 |
|------|------|------|
| **Next.js** | 16.2.7 | 풀스택 프레임워크 (App Router) |
| **React** | 19.2.4 | UI 컴포넌트 및 상태 관리 |
| **TypeScript** | 5.0+ | 타입 안정성 |
| **Tailwind CSS** | v4 | CSS-first 스타일링 |
| **shadcn/ui** | 4.10.0 | UI 컴포넌트 라이브러리 |

### 상태 관리 & 폼
| 기술 | 버전 | 용도 |
|------|------|------|
| **Zustand** | 5.0.14 | 전역 상태 관리 |
| **React Hook Form** | 7.78.0 | 폼 관리 |
| **Zod** | 4.4.3 | 스키마 검증 |

### Backend & Database
| 기술 | 버전 | 용도 |
|------|------|------|
| **Supabase** | - | PostgreSQL 데이터베이스 |
| **Supabase Auth** | - | Google OAuth 인증 |
| **Supabase SSR** | 0.10.3 | 서버사이드 인증 |

### 부가 기능
| 기술 | 버전 | 용도 |
|------|------|------|
| **@anthropic-ai/sdk** | 0.102.0 | AI 에이전트 (Claude API) |
| **xlsx (SheetJS)** | 0.18.5 | Excel 파일 파싱 |
| **@react-pdf/renderer** | 4.5.1 | PDF 문서 생성 |
| **lucide-react** | 1.17.0 | 아이콘 |
| **next-themes** | 0.4.6 | 라이트/다크 모드 |

---

## 📁 프로젝트 구조

```
prism-agent/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── (auth)/                   # 인증 관련 페이지
│   │   │   ├── login/page.tsx        # Google OAuth 로그인
│   │   │   └── auth-code-error/page.tsx
│   │   ├── (dashboard)/              # 대시보드 페이지들
│   │   │   ├── layout.tsx            # 대시보드 공통 레이아웃
│   │   │   ├── page.tsx              # 홈 피드 (KPI, 정산현황)
│   │   │   ├── settlement/           # 정산 관리
│   │   │   ├── writers/              # 전속작가 관리 (관리자)
│   │   │   ├── songs/                # 곡 관리
│   │   │   ├── admin/accounts/       # 계정 관리 (관리자)
│   │   │   ├── staff/                # 직원 목록
│   │   │   ├── revenue/              # 매출 현황
│   │   │   └── writer-portal/        # 전속작가 나의 정산서
│   │   ├── api/
│   │   │   └── auth/callback/route.ts # OAuth 콜백 처리
│   │   ├── globals.css               # Tailwind v4 설정
│   │   └── layout.tsx                # 루트 레이아웃
│   │
│   ├── components/                   # React 컴포넌트
│   │   ├── layout/
│   │   │   ├── DashboardLayout.tsx   # 사이드바 + 헤더 래퍼
│   │   │   ├── AppSidebar.tsx        # 좌측 네비게이션
│   │   │   └── SiteHeader.tsx        # 상단 헤더
│   │   ├── ui/                       # shadcn/ui 기본 컴포넌트
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── sidebar.tsx
│   │   │   └── ...
│   │   └── logo.tsx                  # 로고 컴포넌트
│   │
│   ├── lib/                          # 유틸리티 및 로직
│   │   ├── supabase/
│   │   │   ├── client.ts             # 브라우저 Supabase 클라이언트
│   │   │   └── server.ts             # 서버 Supabase 클라이언트
│   │   ├── auth/
│   │   │   └── emailValidator.ts     # @prism-filter.com 도메인 검증
│   │   ├── settlement/
│   │   │   └── calculator.ts         # 정산 계산 엔진
│   │   └── utils.ts                  # 유틸 함수
│   │
│   ├── hooks/                        # React 커스텀 훅
│   │   ├── useAuth.ts                # 인증 상태 관리
│   │   └── use-mobile.ts             # 모바일 반응형
│   │
│   ├── store/                        # Zustand 상태 관리
│   │   └── authStore.ts              # 전역 인증 상태
│   │
│   └── types/
│       └── index.ts                  # TypeScript 타입 정의
│
├── public/                           # 정적 자산
│   ├── logo.webp
│   ├── prism-filter-logo.svg
│   └── favicon.ico
│
├── supabase/
│   └── migrations/                   # 데이터베이스 마이그레이션
│
├── .env.local                        # 환경 변수 (로컬)
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── postcss.config.mjs
├── CLAUDE.md                         # 개발자 가이드
└── README.md                         # 이 파일
```

---

## 🚀 빠른 시작

### 필수 요구사항
- **Node.js:** 18.0 이상
- **npm:** 9.0 이상
- **Git**

### 설치 및 실행

1. **저장소 클론**
```bash
git clone https://github.com/prismfilter/Erp_agent.git
cd Erp_agent
```

2. **의존성 설치**
```bash
npm install
```

3. **환경 변수 설정** (`.env.local`)
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-supabase-url.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# 개발 환경
NEXT_PUBLIC_SITE_URL=http://localhost:3001

# Anthropic AI
ANTHROPIC_API_KEY=your-api-key
```

4. **개발 서버 실행**
```bash
npm run dev
```

5. **브라우저 접속**
```
http://localhost:3001
```

---

## 📖 주요 명령어

```bash
# 개발 서버 시작 (포트 3001)
npm run dev

# 프로덕션 빌드
npm run build

# 빌드된 앱 실행
npm start

# 코드 린트 체크
npm run lint

# 타입 체크
npx tsc --noEmit
```

---

## 🔐 인증 흐름

```
1. 사용자가 /login 접속
2. Google OAuth 인증 시작
3. Supabase가 OAuth 코드 수신 (/api/auth/callback)
4. 서버가 코드를 세션으로 교환
5. 사용자 정보 + 역할 조회
6. 대시보드로 리다이렉트 (/)
```

### 역할 및 권한
| 역할 | 접근 가능한 페이지 |
|------|-------------------|
| **ADMIN** | 모든 페이지 + 작가 관리 + 계정 관리 |
| **STAFF** | 홈, 직원, 매출현황, 정산서 |
| **WRITER** | 홈, 나의 정산서 (작가 포털) |

---

## 🎨 스타일링 (Tailwind CSS v4)

### 특징
- **CSS-first 방식:** `@import "tailwindcss"` 사용
- **Config 파일 없음:** `globals.css`에서 직접 설정
- **다크모드 지원:** `@custom-variant dark` 사용
- **색상 정의:** oklch 색상공간 (라이트/다크 동시)

### 커스텀 색상
```css
/* globals.css에서 정의됨 */
--color-background: #0f172a (진한 파란색)
--color-foreground: #f1f5f9 (밝은 회색)
--color-primary: oklch(0.546 0.245 262.881) (프리즘 블루)
```

---

## 📊 데이터베이스 구조

### 주요 테이블
- **users** - 사용자 정보 및 역할
- **writers** - 전속작가 정보
- **songs** - 곡 정보
- **settlements** - 정산 기록
- **user_roles** - 사용자 역할 관리

[자세한 스키마는 `supabase/migrations` 참조]

---

## 🔧 개발 가이드

### 코딩 규칙
- **언어:** TypeScript (any 타입 금지)
- **들여쓰기:** 2칸
- **네이밍:** 
  - 변수/함수: camelCase
  - 컴포넌트: PascalCase
  - 상수: UPPER_SNAKE_CASE
- **주석:** 한국어, 필요시만 작성

### 컴포넌트 작성
```tsx
'use client'; // 클라이언트 컴포넌트 선언

import { useState } from 'react';

export default function MyComponent() {
  // 컴포넌트 로직
  return <div>컴포넌트</div>;
}
```

### 상태 관리 (Zustand)
```tsx
import { create } from 'zustand';

const useMyStore = create((set) => ({
  state: 'initial',
  setState: (value) => set({ state: value }),
}));
```

---

## 📋 체크리스트

### 개발 전 확인사항
- [ ] Node.js 18+ 설치
- [ ] `.env.local` 파일 생성 및 설정
- [ ] Supabase 프로젝트 생성
- [ ] Google OAuth 설정

### 배포 전 확인사항
- [ ] 모든 타입 체크 통과 (`npm run lint`)
- [ ] 환경 변수 설정 확인
- [ ] Supabase 권한 설정 (RLS)
- [ ] 로그인 테스트 완료

---

## 🐛 문제 해결

### CSS가 로드되지 않음
```bash
# Tailwind CSS 재컴파일
npm run build

# 또는 개발 서버 재시작
npm run dev
```

### Supabase 연결 오류
- `.env.local`의 `NEXT_PUBLIC_SUPABASE_URL` 확인
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` 확인
- Supabase 프로젝트 활성화 상태 확인

### 로그인 실패
- Google OAuth 설정 확인
- `NEXT_PUBLIC_SITE_URL` 환경 변수 확인
- 사용자 이메일이 @prism-filter.com 도메인인지 확인

---

## 📚 추가 자료

| 문서 | 설명 |
|------|------|
| [CLAUDE.md](./CLAUDE.md) | 개발자 가이드 및 아키텍처 |
| [PRD.md](./PRD.md) | 프로젝트 요구사항 정의서 |
| [IMPLEMENTATION_GUIDE.md](./IMPLEMENTATION_GUIDE.md) | 구현 가이드 |
| [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) | Supabase 설정 가이드 |

---

## 👥 팀 정보

**개발팀:** PRISM FILTER  
**GitHub:** https://github.com/prismfilter/Erp_agent  
**이메일:** it@prism-filter.com

---

## 📝 라이선스

비공개 프로젝트

---

## 🔄 최근 업데이트

**2026-06-09:**
- ✅ Tailwind CSS v4 마이그레이션 완료
- ✅ 프로젝트 파일 정리 및 구조 개선
- ✅ CSS 로드 문제 해결
- ✅ DashboardLayout 컴포넌트 최적화

---

**즐거운 개발 되세요! 🚀**
