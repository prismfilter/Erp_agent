# 설정 메뉴박스(사이드바 프로필 드롭다운) 섹션화·재배치 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 사이드바 하단 프로필 드롭다운(설정 메뉴박스)을 「설정」·「테마」 섹션으로 묶고, 섹션 헤더에 fluent-emoji 컬러 아이콘(톱니바퀴·팔레트)을 적용하며, 드롭다운이 사이드바를 가리지 않도록 오른쪽에 펼쳐지게 한다.

**Architecture:** 변경은 단일 컴포넌트 `AppSidebar.tsx`의 `DropdownMenuContent`(현재 404~467행)에 집중된다. fluent-emoji 컬러 아이콘은 npm 의존성 추가 없이 Microsoft Fluent Emoji의 Color SVG 2개를 `public/icons/`에 두고 `<img>`로 렌더한다. 위치는 base-ui Positioner에 전달되는 `side="right"`로 해결한다.

**Tech Stack:** Next.js 16 (App Router) · React 19 · TypeScript strict · Tailwind v4 · base-ui DropdownMenu(shadcn 래퍼) · lucide-react(기존 아이콘 유지) · Microsoft Fluent Emoji Color SVG(섹션 헤더 2종)

## Global Constraints

- `any` 타입 금지, 들여쓰기 2칸, 주석 한국어.
- 기존 lucide 단색 아이콘 체계는 유지 — fluent-emoji는 **「설정」·「테마」 섹션 헤더 2곳에만** 사용.
- 커밋/푸시/머지는 **사용자가 명시적으로 지시할 때만**(자동 금지).
- `DropdownMenuContent`은 `side`/`align`/`sideOffset`/`alignOffset`을 base-ui Positioner로 전달함(`dropdown-menu.tsx:21-50`) — 추가 래퍼 수정 불필요.
- `DropdownMenuItem`의 `[&_svg:not([class*='size-'])]:size-4` 규칙은 `svg`에만 적용 → `<img>` 아이콘의 `w-5 h-5`는 그대로 유효.

---

## 확정 사항 / 발견

- "설정 메뉴박스" = `AppSidebar.tsx`의 `DropdownMenuContent`(404~467행). 트리거는 사이드바 하단 프로필 행(380~403행).
- 현재 구조: [사용자정보] / 구분선 / `내 프로필 설정` / `계정 관리`(ADMIN) / 구분선 / 테마 RadioGroup(라벨 `테마` + 라디오 3개) / 구분선 / `로그아웃`.
- 테마 헤더 아이콘이 "안 보임"의 원인은 라이브러리가 아니라 색(`THEME_GROUP_COLOR = text-fuchsia-500`)·크기(`w-3.5`). 사용자가 fluent-emoji 컬러 아이콘으로 교체를 선택함.
- 현재 위치 `side="top" align="start"` → 사이드바와 겹침. `side="right"`로 오른쪽에 펼침.
- fluent-emoji 에셋 URL 200 확인 완료(실제 SVG, LFS 포인터 아님):
  - 톱니바퀴: `https://cdn.jsdelivr.net/gh/microsoft/fluentui-emoji@main/assets/Gear/Color/gear_color.svg`
  - 팔레트: `https://cdn.jsdelivr.net/gh/microsoft/fluentui-emoji@main/assets/Artist%20palette/Color/artist_palette_color.svg`
- 시각 레이아웃 변경이라 단위 테스트(vitest) 대상 없음 → 검증은 `type-check`/`eslint`/`build` + Playwright 시각 확인으로 수행.

---

### Task 1: fluent-emoji 컬러 아이콘 에셋 추가

**Files:**
- Create: `public/icons/fluent-gear-color.svg`
- Create: `public/icons/fluent-palette-color.svg`

**Interfaces:**
- Produces: 정적 경로 `/icons/fluent-gear-color.svg`, `/icons/fluent-palette-color.svg` (Task 2의 `<img src>`가 참조).

- [ ] **Step 1: 에셋 디렉터리 생성 + SVG 2개 다운로드**

Run (Git Bash):
```bash
mkdir -p public/icons
curl -sL "https://cdn.jsdelivr.net/gh/microsoft/fluentui-emoji@main/assets/Gear/Color/gear_color.svg" -o public/icons/fluent-gear-color.svg
curl -sL "https://cdn.jsdelivr.net/gh/microsoft/fluentui-emoji@main/assets/Artist%20palette/Color/artist_palette_color.svg" -o public/icons/fluent-palette-color.svg
```

- [ ] **Step 2: 다운로드 검증(둘 다 `<svg`로 시작)**

Run:
```bash
head -c 5 public/icons/fluent-gear-color.svg; echo; head -c 5 public/icons/fluent-palette-color.svg; echo
```
Expected: 두 줄 모두 `<svg` 출력 (HTML 오류 페이지/빈 파일 아님).

- [ ] **Step 3: 커밋(사용자 지시 시에만 — 자동 금지)**

본 플랜의 Global Constraints에 따라 커밋은 사용자가 명시적으로 지시할 때만 수행한다.

---

### Task 2: 드롭다운 섹션화·재스타일·재배치 (`AppSidebar.tsx`)

**Files:**
- Modify: `src/components/layout/AppSidebar.tsx` (import 정리: 24행 / 드롭다운 본문: 404~467행)

**Interfaces:**
- Consumes: `/icons/fluent-gear-color.svg`, `/icons/fluent-palette-color.svg` (Task 1).
- Consumes(유지): `THEME_META`(테마 라디오 아이콘·라벨·색), `RoleLabel`, lucide `User/Settings/LogOut`.

- [ ] **Step 1: 미사용 import 제거 (내 변경으로 orphan이 되는 것만)**

24행의 import에서 `THEME_GROUP_ICON, THEME_GROUP_COLOR`를 제거(섹션 헤더 아이콘을 fluent-emoji `<img>`로 대체하므로 더 이상 사용 안 함). `THEME_META`는 유지.

변경 전:
```tsx
import { THEME_META, THEME_GROUP_ICON, THEME_GROUP_COLOR } from '@/lib/ui/themeMeta';
```
변경 후:
```tsx
import { THEME_META } from '@/lib/ui/themeMeta';
```

- [ ] **Step 2: `DropdownMenuContent` 본문 교체 (404~467행 전체)**

변경 후 전체 블록:
```tsx
          <DropdownMenuContent side="right" align="end" sideOffset={8} className="w-56 bg-card border-border">
            {/* 사용자 정보 */}
            <div className="px-3 py-2">
              <p className="text-xs text-muted-foreground truncate">
                {user?.email}
              </p>
              <p className="text-xs font-medium text-foreground">
                <RoleLabel role={user?.role ?? null} />
              </p>
            </div>
            <DropdownMenuSeparator className="bg-border" />

            {/* ===== 설정 섹션 ===== */}
            {/* 섹션명은 가운데 정렬·볼드, 헤더 아이콘은 하위 메뉴 글자보다 크게(w-5) */}
            <DropdownMenuLabel className="flex items-center justify-center gap-1.5 text-sm font-bold text-foreground">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/icons/fluent-gear-color.svg" alt="" aria-hidden="true" className="w-5 h-5" /> 설정
            </DropdownMenuLabel>

            {/* 프로필 설정 (하위 메뉴 — 섹션명보다 작은 글자) */}
            <DropdownMenuItem
              onClick={() => {
                router.push('/profile');
                onClose?.();
              }}
              className="text-foreground cursor-pointer gap-2 text-xs"
            >
              <User className="w-4 h-4 text-sky-500" /> 내 프로필 설정
            </DropdownMenuItem>

            {/* 계정 관리 (ADMIN만) */}
            {user?.role === 'ADMIN' && (
              <DropdownMenuItem
                onClick={handleAdminAccounts}
                className="text-foreground cursor-pointer gap-2 text-xs"
              >
                <Settings className="w-4 h-4" /> 계정 관리
              </DropdownMenuItem>
            )}

            <DropdownMenuSeparator className="bg-border" />

            {/* ===== 테마 섹션 ===== */}
            <DropdownMenuRadioGroup
              value={theme || 'dark'}
              onValueChange={handleThemeChange}
            >
              {/* 섹션명은 가운데 정렬·볼드, 팔레트 아이콘은 하위 메뉴 글자보다 크게(w-5) */}
              <DropdownMenuLabel className="flex items-center justify-center gap-1.5 text-sm font-bold text-foreground">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/icons/fluent-palette-color.svg" alt="" aria-hidden="true" className="w-5 h-5" /> 테마
              </DropdownMenuLabel>
              {THEME_META.map(({ key, label, Icon, color }) => (
                <DropdownMenuRadioItem
                  key={key}
                  value={key}
                  className="text-foreground gap-2 text-xs"
                >
                  <Icon className={`w-4 h-4 ${color}`} /> {label}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>

            <DropdownMenuSeparator className="bg-border" />

            {/* 로그아웃 */}
            <DropdownMenuItem
              onClick={handleLogout}
              className="text-red-400 cursor-pointer gap-2 text-xs"
            >
              <LogOut className="w-4 h-4" /> 로그아웃
            </DropdownMenuItem>
          </DropdownMenuContent>
```

요구사항 매핑:
- **섹션화**: `내 프로필 설정`·`계정 관리` 위에 `설정` 헤더(`DropdownMenuLabel`) 추가 → 「설정」 섹션. 기존 테마 RadioGroup은 「테마」 섹션.
- **헤더 아이콘**: 설정=fluent 톱니바퀴, 테마=fluent 팔레트(컬러). `w-5 h-5`로 하위 메뉴 글자(`text-xs`)보다 큼.
- **헤더 글자**: `text-sm font-bold`(하위 `text-xs`보다 크고 볼드).
- **하위 메뉴 글자 축소**: 모든 항목/라디오에 `text-xs` 추가(섹션 헤더 `text-sm`보다 작음).
- **섹션명 가운데 정렬**: 헤더 `justify-center`.
- **재배치**: `side="right" align="end" sideOffset={8}` → 사이드바 오른쪽, 프로필 행 기준 하단 정렬로 펼침(겹침 해소).

- [ ] **Step 3: 정적 검증**

Run:
```bash
npm run type-check
npx eslint src/components/layout/AppSidebar.tsx
npm run build
```
Expected: `type-check` 0 error. eslint은 `no-img-element` disable 주석으로 **신규 경고 0**(기존 로고 `<img>` 경고만 잔존, 신규 에러 없음). build 성공.

- [ ] **Step 4: Playwright 시각 검증 (인증 세션, 포트 3001)**

확인 항목:
1. 사이드바 하단 프로필 행 클릭 → 메뉴가 **사이드바 오른쪽**에 펼쳐지고 사이드바를 가리지 않음.
2. 「설정」·「테마」 섹션 헤더가 **가운데 정렬·볼드**, 각각 톱니바퀴·팔레트 **컬러 아이콘** 표시(보라색 안 보임 문제 해소).
3. 하위 항목(내 프로필 설정/계정 관리/라이트/다크/Classic 다크) 글자가 헤더보다 작음.
4. 라이트/다크/Classic 다크 3개 테마에서 메뉴 가독성 확인(컬러 아이콘은 의도상 고정색).
5. 콘솔 에러 0, 404(에셋 미로드) 없음.

- [ ] **Step 5: 커밋(사용자 지시 시에만 — 자동 금지)**

---

## Self-Review

- **Spec coverage:**
  - 섹션 그룹화(설정/테마) → Task 2 Step 2 ✅
  - 테마 아이콘 가시성(팔레트 컬러, 크게) → Task 1 + Task 2(`w-5`) ✅
  - 설정 톱니바퀴 아이콘 + 헤더 볼드·크게 → Task 2(`text-sm font-bold`, `w-5`) ✅
  - 하위 메뉴 글자 < 섹션 글자 → Task 2(`text-xs` vs `text-sm`) ✅
  - 섹션명 가운데 정렬 → Task 2(`justify-center`) ✅
  - 사이드바 안 겹치게 오른쪽 표시 → Task 2(`side="right"`) ✅
- **Placeholder scan:** TBD/TODO 없음. 모든 코드·명령·URL 실값.
- **Type consistency:** `THEME_META` 구조분해(`key,label,Icon,color`)는 `themeMeta.ts:17-21`과 일치. 제거하는 `THEME_GROUP_ICON/COLOR`는 본 파일 외 `ThemeToggle.tsx`에서 사용될 수 있으므로 **themeMeta.ts의 export 자체는 삭제하지 않음**(이 파일의 import만 제거).
