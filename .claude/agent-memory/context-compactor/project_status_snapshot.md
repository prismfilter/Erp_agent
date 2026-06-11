---
name: project-status-current
description: 프리즘 필터 ERP 프로젝트 현재 상태 스냅샷 (2026-06-11)
metadata:
  type: project
---

## 프로젝트 개요
**프리즘 필터 뮤직그룹 ERP 내 전속작가 정산 자동화 시스템**
- 음악 저작권 정산 수동 처리(4시간, 2-3% 오류) → 웹 기반 자동화로 전환
- 대상: 전속작가 5명, 관리 저작물 164건
- 예정 적용: 2026년 2분기(4월)부터

---

## 기술 스택 (설치 확정 버전)

| 영역 | 기술 | 버전 |
|------|------|------|
| Frontend | Next.js (App Router) | 16.2.7 |
| | React | 19.2.4 |
| Styling | Tailwind CSS (CSS-first) | v4 |
| | shadcn/ui (base-ui) | 4.10.0 |
| 상태관리 | Zustand | 5.0.14 |
| 폼/검증 | React Hook Form | 7.78.0 |
| | Zod | 4.4.3 |
| Database | Supabase (PostgreSQL) | - |
| AI | @anthropic-ai/sdk | 0.102.0 |
| 유틸 | xlsx (SheetJS) | 0.18.5 |
| | @react-pdf/renderer | 4.5.1 |
| | lucide-react | 1.17.0 |
| | next-themes | 0.4.6 |

---

## 프로젝트 구조
```
src/
├── app/
│   ├── (auth)/login, callback
│   ├── (dashboard)/
│   │   ├── page.tsx (홈 피드)
│   │   ├── settlement/, writers/, songs/
│   │   ├── admin/accounts/ (ADMIN only)
│   │   ├── staff/, revenue/, writer-portal/
│   └── layout.tsx (ThemeProvider)
├── components/
│   ├── layout/ (DashboardLayout, AppSidebar, SiteHeader)
│   ├── ui/ (shadcn 컴포넌트)
├── lib/
│   ├── supabase/, auth/, agent/, settlement/
├── hooks/, store/, types/
└── globals.css (Tailwind v4 + 색상 토큰)
```

---

## 최근 완료 작업 (커밋: 2aeba6c ~ dc62a03)

### 1. UI/UX 개선
- ✅ **LoadingScreen.tsx** — 원형 그라데이션 애니메이션 구현
- ✅ **다크모드** — Cosmic Indigo 그라데이션 색상 적용
- ✅ **사이드바 메뉴** — 재구성 및 구성원/작가목록 페이지 개편

### 2. 인프라 & 배포
- ✅ **Cloudflare 터널** — 설정 완료

### 3. 권한 관리 (역할 시스템 개편)
- ✅ **구성원 페이지** — 역할 무관 접근 허용 (전체 접근)
- ✅ **작가 목록 페이지** — 역할 무관 접근 허용 (전체 접근)
- ✅ **역할 시스템** — 개편 완료 (ADMIN/STAFF/WRITER)

### 4. 개발 도구 설치
- ✅ **sequential-thinking MCP** — 설치
- ✅ **playwright MCP** — 설치

### 5. 프로젝트 정리
- ✅ **불필요 문서** — 삭제
- ✅ **CLAUDE.md** — 슬림화
- ✅ **PRD.md** — 역할명 수정

---

## 현재 상태

| 항목 | 상태 |
|------|------|
| **브랜치** | master |
| **최신 커밋** | dc62a03 (또는 2aeba6c) |
| **개발 서버** | localhost:3001 실행 중 |
| **빌드** | ✅ 정상 |
| **테스트** | - |

---

## 환경 변수 (.env.local)

```bash
NEXT_PUBLIC_SUPABASE_URL=https://aqsrhesndraehhlonqib.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<JWT-KEY>
SUPABASE_SERVICE_ROLE_KEY=<SERVICE-ROLE-KEY>
NEXT_PUBLIC_SITE_URL=http://localhost:3000
ANTHROPIC_API_KEY=<API-KEY>
```

---

## 다음 단계 (추정)
- 전속작가 포털 기능 확장
- 정산 로직 고도화
- 성능 최적화 (이미지 최적화, 번들 분석)
- 배포 및 모니터링 설정

---

## 주의사항
- **Tailwind v4** — CSS-first 방식, tailwind.config 없음
- **RLS** — Supabase 필수 (역할별 데이터 접근 제어)
- **any 타입** — 금지
- **코드 언어** — 영어, 주석/커밋은 한국어
