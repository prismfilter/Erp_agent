# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## 프로젝트 요약

**프리즘 필터 뮤직그룹 ERP 내 전속작가 정산 자동화 시스템**

음악 저작권 정산을 수동 처리(4시간 소요, 2-3% 오류)에서 웹 기반 자동화로 전환.  
전속작가 5명, 관리 저작물 164건 대상.  
2026년 2분기(4월)부터 시스템 적용.

---

## 기술 스택 (실제 설치 버전)

| 영역 | 기술 | 버전 |
|------|------|------|
| **Frontend** | Next.js (App Router) | 16.2.7 |
| | React | 19.2.4 |
| | TypeScript | 5.0+ |
| **Styling** | Tailwind CSS (CSS-first) | v4 |
| | shadcn/ui (base-ui) | 4.10.0 |
| **UI 컴포넌트** | button, avatar, dropdown-menu, badge, card, separator, sidebar | - |
| **상태 관리** | Zustand | 5.0.14 |
| **폼/검증** | React Hook Form | 7.78.0 |
| | Zod | 4.4.3 |
| **다크모드** | next-themes | 0.4.6 |
| **Database** | Supabase (PostgreSQL) | - |
| **인증** | Supabase Auth (Google OAuth) | - |
| **AI 에이전트** | @anthropic-ai/sdk | 0.102.0 |
| **엑셀 파싱** | xlsx (SheetJS) | 0.18.5 |
| **PDF 생성** | @react-pdf/renderer | 4.5.1 |
| **아이콘** | lucide-react | 1.17.0 |

---

## Tailwind CSS v4 특이사항

- **tailwind.config 파일 없음** — CSS-first 방식 적용
- **globals.css 설정:**
  - `@import "tailwindcss"` — Tailwind 메인 임포트
  - `@theme inline { }` 블록 — 전체 CSS 변수 정의
  - `@custom-variant dark (&:is(.dark *))` — 다크모드 지원
- **PostCSS:** `@tailwindcss/postcss` 플러그인 (postcss.config.mjs)
- **색상:** oklch 색상공간 사용 (라이트/다크 모드 동시 정의)

---

## 프로젝트 구조

```
src/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx              # Google OAuth 로그인 페이지
│   │   └── callback/page.tsx           # OAuth 콜백 처리
│   ├── (dashboard)/
│   │   ├── layout.tsx                  # 대시보드 레이아웃
│   │   ├── page.tsx                    # 홈 피드 (메인 대시보드)
│   │   ├── settlement/
│   │   ├── writers/
│   │   ├── songs/page.tsx
│   │   ├── admin/accounts/page.tsx
│   │   ├── staff/page.tsx
│   │   ├── revenue/page.tsx
│   │   └── writer-portal/page.tsx      # 전속작가 포털
│   ├── auth/callback/page.tsx          # OAuth 콜백 클라이언트 페이지
│   └── layout.tsx                      # 루트 레이아웃 (ThemeProvider)
├── components/
│   ├── layout/
│   │   ├── DashboardLayout.tsx         # SidebarProvider + SidebarInset
│   │   ├── AppSidebar.tsx              # 네비게이션 사이드바
│   │   ├── SiteHeader.tsx              # 상단 헤더 + 프로필 드롭다운
│   │   └── (삭제: Sidebar.tsx, Navbar.tsx)
│   ├── logo/
│   ├── ui/                             # shadcn 컴포넌트
│   │   ├── button.tsx
│   │   ├── avatar.tsx
│   │   ├── dropdown-menu.tsx
│   │   ├── badge.tsx
│   │   ├── card.tsx
│   │   ├── separator.tsx
│   │   └── sidebar.tsx                 # shadcn 사이드바
│   └── ...
├── lib/
│   ├── supabase/
│   ├── auth/
│   ├── agent/
│   ├── settlement/
│   └── utils/
├── hooks/
│   ├── useAuth.ts                      # 인증 상태 관리
│   └── ...
├── store/
│   └── authStore.ts                    # Zustand 인증 스토어
├── types/
│   └── index.ts                        # TypeScript 타입 정의
└── globals.css                         # Tailwind v4 + 색상 토큰
```

---

## 개발 명령어

```bash
npm run dev          # 개발 서버 (http://localhost:3000)
npm run build        # 빌드
npm run type-check   # 타입 체크
npm run lint         # ESLint
npx shadcn@latest add [component]  # shadcn 컴포넌트 추가
```

---

## 환경 변수 (.env.local)

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://aqsrhesndraehhlonqib.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<JWT-KEY>
SUPABASE_SERVICE_ROLE_KEY=<SERVICE-ROLE-KEY>

# 개발환경
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Anthropic AI
ANTHROPIC_API_KEY=<API-KEY>
```

---

## 인증 흐름

1. **로그인:** `/login` → Google OAuth (Supabase)
2. **콜백:** `/auth/callback/page.tsx` → 세션 확인 + 대시보드 리다이렉트
3. **인증 확인:** `useAuth()` 훅 → `authStore` (Zustand) 상태 동기화
4. **이메일 검증:** `@prism-filter.com` 도메인만 허용
5. **역할 할당:** DB `user_roles` 테이블 → ADMIN/STAFF/WRITER 역할
6. **로그아웃:** Navbar 프로필 드롭다운 → `supabase.auth.signOut()` + 세션 삭제

---

## 코딩 규칙

- **타입:** `any` 금지, TypeScript 엄격 모드
- **들여쓰기:** 2칸 (Tailwind 클래스명도 동일)
- **컴포넌트:** PascalCase, 클라이언트는 `'use client'` 선언
- **네이밍:**
  - 변수/함수: camelCase
  - 컴포넌트: PascalCase
  - 상수: UPPER_SNAKE_CASE
- **주석:** 한국어, 필요시만 (자명한 코드는 주석 불필요)
- **정산 로직:** `lib/settlement/` 폴더 (순수 함수)
- **AI 에이전트:** `lib/agent/` 폴더
- **Supabase RLS:** 필수 (역할별 데이터 접근 제어)

---

## 개발환경

- **OS:** Windows 11 Pro
- **Shell:** PowerShell (PowerShell Core 7+)
- **Node:** LTS (v18+)
- **Package Manager:** npm

---

## UI/UX 가이드

### 색상 (라이트/다크 모드 자동)
- **Primary:** oklch(0.546 0.245 262.881) — 프리즘 블루
- **Sidebar Primary:** 파란색 배경 + 흰 텍스트 (활성 메뉴)
- **Sidebar Accent:** 호버시 밝은 배경

### 레이아웃
- **사이드바:** 좌측 고정, 모바일에서 토글 (SidebarTrigger)
- **헤더:** 상단 고정, 현재 페이지명 + 프로필 드롭다운
- **콘텐츠:** max-w-screen-xl, 좌우 여백 px-4 md:px-6 lg:px-8

### 카테고리 (메뉴)
1. 홈 피드 (`/`)
2. 직원 (`/staff`)
3. 전속작가 (`/writers`) — ADMIN only
4. 매출현황 (`/revenue`)
5. 정산서 (`/settlement`)
6. 계정 관리 (`/admin/accounts`) — ADMIN only

---

## Context7 MCP 서버 사용 가이드

### Context7이란?
AI 코딩 어시스턴트(Claude Code, Gemini CLI 등)에게 **최신 공식 문서와 코드 예제를 실시간으로 주입**하는 MCP(Model Context Protocol) 서버입니다.

학습 데이터가 과거 기준이라 발생하는 deprecated API 사용, 구식 문법 생성 등의 문제를 해결합니다.

### 사용 방법

#### 1️⃣ 프롬프트 끝에 "context7 사용" 추가
```
<원래 프롬프트>

context7을 사용해줘
```

#### 2️⃣ 또는 특정 라이브러리 지정
```
Next.js 16+ 최신 App Router 패턴으로 작성해줘

context7을 사용해줘
```

#### 3️⃣ 또는 특정 기능 요청
```
Tailwind CSS v4 CSS-first 방식으로 스타일링해줘. 공식 문서를 참고해줘

context7을 사용해줘
```

### 지원하는 라이브러리 (자동 참고)
- **Next.js** 16.2+ (App Router, Server Components)
- **React** 19.2+ (Hooks, Concurrent Features)
- **TypeScript** 5.0+
- **Tailwind CSS** v4 (CSS-first)
- **Supabase** (Auth, RLS, Realtime)
- **React Hook Form** 7.78+
- **Zod** 4.4+
- **shadcn/ui** 4.10+
- **Zustand** 5.0+
- **Lucide React** 1.17+

### 주요 이점
✅ **최신 API 사용** — deprecated된 코드 생성 방지  
✅ **최신 패턴 학습** — 현재 모범 사례 적용  
✅ **타입 안정성** — 최신 TypeScript 정의 반영  
✅ **성능 최적화** — 최신 성능 권장사항 적용  
✅ **보안 개선** — 최신 보안 패턴 적용

### MCP 설정 위치
- **설정 파일:** `.claude/mcp.json`
- **자동 초기화:** Claude Code 시작 시 자동 활성화
- **캐시:** 3600초(1시간) TTL로 문서 캐시

---

**See PRD.md for detailed requirements**
