# 라이트 모드 색상 전면 개편 (디자인 불변·색상만)

## 목표
라이트 모드가 밋밋·이상하게 보이는 문제 해결. 레퍼런스(Infraly ERP 대시보드, Image #23·#24 + dribbble erp-ui 톤)를 참고해
**중립 소프트 그레이 캔버스 + 흰 카드 + 바이올렛 그라디언트 액센트 + 파스텔 상태색**으로 통일.
로그인 페이지 포함. **레이아웃/구조/폰트크기/아이콘위치 등 디자인은 절대 불변, 오직 색·배경·그림자·보더색만 변경.**

## 확정 결정 (2026-06-18, 사용자)
- **라이트 primary = 바이올렛 `#7c5cff`** (레퍼런스 일치). 다크/Classic은 기존 인디고/블루 유지 — 라이트만 변경.
- 구현은 **새 세션**에서 이 계획서를 기준으로 진행.

## 절대 원칙
- 모든 변경은 `:root/.light` 또는 `.light …` 셀렉터로 **스코프**. `.dark`·`.classic-dark`·`.dark …`/`.classic-dark …` 블록은 **절대 건드리지 않음**(회귀 방지).
- 차트는 라이트/다크 공용 → 가능하면 `var(--primary)`/`var(--accent)`/`currentColor`로 토큰화하거나, 라이트·다크 모두 어울리는 그라디언트로(다크 회귀 점검 필수).
- "그라디언트 느낌"은 background/box-shadow 속성으로만 구현(레이아웃 변경 아님).

## 핵심 레버 = `src/app/globals.css`

### 1) `:root, .light` 토큰 값 교체 (레퍼런스 팔레트)
| 토큰 | 현재 | 변경 |
|------|------|------|
| `--background` | `#eef1f6` (푸른끼) | `#f5f5f8` (중립 소프트 그레이) |
| `--foreground` | `#1f2937` | `#1a1a22` (near-black 제목) |
| `--primary` | `#6366f1` (indigo) | `#7c5cff` (바이올렛) |
| `--primary-foreground` | `#ffffff` | 유지 |
| `--sidebar` | `#ffffff` | 유지 |
| `--sidebar-foreground` | `#475569` | `#5a5a6b` (중립 그레이) |
| `--card` | `#ffffff` | 유지 |
| `--border` | `#e2e6ee` | `#ececf1` (옅은 중립) |
| `--muted` | `#eceff5` | `#f1f1f5` (표 헤더·트랙용 옅은 그레이) |
| `--muted-foreground` | `#64748b` | `#8a8a99` (부제 회색) |
| `--accent` | `#4f46e5` | `#6a45f4` (그라디언트 짝) |

### 2) `.light` 전용 그라디언트 오버라이드 추가 (다크 블록의 대칭, `@layer` 밖)
- 활성 메뉴:
  ```css
  .light [aria-current="page"] {
    background: linear-gradient(135deg, #7c5cff 0%, #9d86ff 100%) !important;
    box-shadow: 0 4px 14px rgba(124, 92, 255, 0.28) !important;
  }
  .light [aria-current="page"]:hover {
    background: linear-gradient(135deg, #8b6dff 0%, #a994ff 100%) !important;
  }
  ```
- (검토) 주요 액션 버튼이 `bg-primary` 단색이면 `.light .bg-primary`에 바이올렛 그라디언트 부여 가능 — 단 primary-foreground(흰색) 대비 유지.
- 기존 `.light .bg-card` box-shadow는 유지(소프트 분리감). 필요 시 그림자 톤만 보라끼로 미세조정.

### 3) 토큰 참조라 자동 적응되는 것 (확인만)
- 그라디언트 스크롤바·cmdk·row-focus: `var(--primary)`/`var(--accent)` 참조 → 자동 반영 ✓
- react-day-picker: `.rdp-popover`에 하드코딩 `#5c6cff`·`#8097ff`·`#4a5ee8` 존재 → 라이트에서 바이올렛 톤과 어긋나면 `var(--primary)`/`var(--accent)` 또는 `.light .rdp-…` 오버라이드로 보정.

## 2순위 = 토큰만으로 안 되는 잔여

### 4) 차트 (`src/components/revenue/`) — **사용자 강조 항목**
대상: `YearlyChart.tsx`, `QuarterlyChart.tsx`, `CategoryBarChart.tsx`, `ChartTooltip.tsx` (커스텀 SVG, 색 하드코딩)
- 각 파일을 읽고 막대/영역 fill을 **세로 linearGradient**로: 위 `#7c5cff`(또는 `var(--primary)`) → 아래 `#e9e3fd`(또는 낮은 투명도). 레퍼런스 막대 느낌.
- 라인 차트: 단색 바이올렛 stroke + 옅은 영역 fill(낮은 opacity).
- 비교군(전년 등) 막대: 옅은 그레이 `#e9eaf0`.
- 축/그리드선: `var(--border)`·옅은 회색, 라벨: `var(--muted-foreground)`.
- `ChartTooltip` 배경: `var(--card)`/텍스트 `var(--foreground)` 확인(레퍼런스 툴팁은 진한 칩 — 라이트에서도 가독성 OK한지).
- **다크 공용** → 토큰/`currentColor` 우선. 3테마 모두 확인.

### 5) 표 헤더 ↔ 목록 구분 (사용자 강조)
표 사용 페이지: `staff`, `admin/accounts`, `admin/writers`, `admin/clients`, `admin/works/permanent`, `admin/price-table` 등.
- thead 배경: 흰 행과 명확히 구분되게 옅은 그레이/연보라(`bg-muted` 또는 `bg-primary/8`) + `text-muted-foreground` 라벨 + 하단 보더. 현재 `bg-primary/10` 통일 여부 점검 후 라이트 가독 기준으로 일원화.
- tbody: 흰 행 + `divide-border` 옅은 라인(기존) + hover `bg-primary/5`(연보라). 레퍼런스 표 톤과 일치.

### 6) 로그인 페이지 (`src/app/(auth)/login/page.tsx`)
- 토큰 기반인지/하드코딩 색·그라디언트인지 확인 후, 레퍼런스 톤(소프트 그레이 배경 + 흰 카드 + 바이올렛 그라디언트 버튼)으로. 디자인/레이아웃 불변.
- `auth-code-error` 페이지도 동일 점검.

### 7) 상태·증감색 (전역 점검)
- 양수 `text-emerald-600` / 음수 `text-rose-500`.
- 상태 배지 파스텔: `bg-{green|amber|rose|violet}-50 text-{…}-600`(레퍼런스 On Track/At Risk/Complete/Over Budget 톤). 라이트에서 너무 쨍하지 않게.
- 역할 배지(이미 카테고리색 적용됨)·사이드바 아이콘색은 레퍼런스와 충돌 없으면 유지.

## 검증
- `npm run type-check` 0 · `npx eslint src/` 0 · `npm run build` 성공.
- Playwright(인증 세션, 포트 3001) 라이트 모드: 로그인 → 홈 → 매출(차트) → 구성원/계정(표) 스크린샷, 레퍼런스 대조.
- **다크·Classic 다크도** 동일 화면 스크린샷 → 회귀 없음 확인(특히 차트·rdp).
- 디자인 불변 확인: 레이아웃/폭/폰트/아이콘 위치 변화 0, 색만 변경.

## 커밋
- 커밋/푸시/머지는 **사용자가 명시적으로 지시할 때만**(자동 금지).

## 비고
- 컨텍스트 분량이 커, 구현은 가급적 **새 세션**에서 이 계획서를 기준으로 진행 권장.
