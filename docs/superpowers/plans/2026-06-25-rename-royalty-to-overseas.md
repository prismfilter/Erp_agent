# "저작권료 정산" → "해외 저작권료 정산" 라벨 변경 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 사이드바 메뉴·브레드크럼·페이지 헤더를 포함해 사용자에게 보이는 "저작권료 정산" 라벨을 모두 "해외 저작권료 정산"으로 바꾼다(라우트·키·로직은 그대로).

**Architecture:** 순수 라벨(문자열) 변경. 네비게이션 라벨이 3곳(사이드바·브레드크럼 맵·검색 팔레트)에 흩어져 있고 페이지 본문에 4건이 있다. 라우트(`/settlement/royalty`), 검색 key(`'royalty'`), 링크 href, 함수·변수명, 도메인 로직은 **변경하지 않는다.**

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript strict, Tailwind v4. 로직 변경 없음(라벨 텍스트만).

## Global Constraints

- **라우트/키/href 불변:** `/settlement/royalty`, 검색 `key: 'royalty'`, `href="/settlement/new?type=royalty"`, 컴포넌트/함수명(`RoyaltySettlementPage` 등)은 그대로 둔다. 바꾸는 것은 **화면에 보이는 한글 라벨 문자열뿐.**
- 정확 매칭: `'용역 정산'` 등 다른 라벨은 절대 건드리지 않는다. 반드시 "저작권료 정산"이 포함된 토큰만 교체.
- TS strict·any 금지·2칸·한국어 주석. 메모리 규칙[rename_menu_also_header]: 메뉴 라벨 변경 시 페이지 h1·브레드크럼·검색 SCOPES 라벨을 함께 변경(라우트 유지) — 본 계획이 이를 충족.
- 커밋·푸시·머지는 사용자가 명시적으로 지시할 때만.

---

## File Structure

**수정(7건, 4파일):**
- `src/components/layout/AppSidebar.tsx` — 사이드바 메뉴 라벨(정산서 하위)
- `src/components/layout/SiteHeader.tsx` — 브레드크럼용 PAGE_LABELS 맵
- `src/components/search/CommandPalette.tsx` — 검색 팔레트 SCOPES 라벨
- `src/app/(dashboard)/settlement/royalty/page.tsx` — 페이지 h1·버튼·빈상태·주석

이들은 모두 같은 기능의 라벨이라 한 묶음으로 변경한다(단일 태스크).

---

## Task 1: "저작권료 정산" 라벨 → "해외 저작권료 정산" 일괄 변경

**Files:**
- Modify: `src/components/layout/AppSidebar.tsx:66`
- Modify: `src/components/layout/SiteHeader.tsx:20`
- Modify: `src/components/search/CommandPalette.tsx:35`
- Modify: `src/app/(dashboard)/settlement/royalty/page.tsx:7,17,23,28`

**Interfaces:**
- Consumes: 없음
- Produces: 없음(UI 라벨만 변경, 시그니처/라우트 불변)

> 이 작업은 순수 라벨 변경이라 단위 테스트 대상 로직이 없다. TDD 대신 타입체크·린트·빌드 + 시각 확인으로 검증한다.

- [ ] **Step 1: 사이드바 메뉴 라벨 변경**

`src/components/layout/AppSidebar.tsx` 66행. `href`는 그대로, `label`만 변경.

```tsx
// 변경 전
      { label: '저작권료 정산', href: '/settlement/royalty' },
// 변경 후
      { label: '해외 저작권료 정산', href: '/settlement/royalty' },
```

- [ ] **Step 2: 브레드크럼(PAGE_LABELS 맵) 변경**

`src/components/layout/SiteHeader.tsx` 20행. 키(경로)는 그대로, 값(라벨)만 변경.

```tsx
// 변경 전
  '/settlement/royalty': '저작권료 정산',
// 변경 후
  '/settlement/royalty': '해외 저작권료 정산',
```

- [ ] **Step 3: 검색 팔레트(SCOPES) 라벨 변경**

`src/components/search/CommandPalette.tsx` 35행. `key`/`icon`/`href`/`perm`은 그대로, `label`만 변경.

```tsx
// 변경 전
  { key: 'royalty', label: '저작권료 정산', icon: Music, href: '/settlement/royalty', perm: 'all' },
// 변경 후
  { key: 'royalty', label: '해외 저작권료 정산', icon: Music, href: '/settlement/royalty', perm: 'all' },
```

- [ ] **Step 4: 페이지 헤더(h1) 변경**

`src/app/(dashboard)/settlement/royalty/page.tsx` 17행.

```tsx
// 변경 전
            <h1 className="text-2xl font-bold">저작권료 정산</h1>
// 변경 후
            <h1 className="text-2xl font-bold">해외 저작권료 정산</h1>
```

- [ ] **Step 5: 페이지 '새 정산' 버튼 텍스트 변경(일관성)**

`src/app/(dashboard)/settlement/royalty/page.tsx` 23행. `<Link href="/settlement/new?type=royalty">`(21행)는 **변경하지 않는다** — 버튼 라벨만.

```tsx
// 변경 전
            <Plus className="w-4 h-4 mr-2" />새 저작권료 정산
// 변경 후
            <Plus className="w-4 h-4 mr-2" />새 해외 저작권료 정산
```

- [ ] **Step 6: 페이지 빈상태 안내문 변경(일관성)**

`src/app/(dashboard)/settlement/royalty/page.tsx` 28행.

```tsx
// 변경 전
        <p className="text-muted-foreground">저작권료 정산 목록이 표시됩니다.</p>
// 변경 후
        <p className="text-muted-foreground">해외 저작권료 정산 목록이 표시됩니다.</p>
```

- [ ] **Step 7: 페이지 상단 주석 변경(일관성)**

`src/app/(dashboard)/settlement/royalty/page.tsx` 7행.

```tsx
// 변경 전
// 저작권료 정산 — 음악 저작권 수익을 전속작가에게 배분하는 정산
// 변경 후
// 해외 저작권료 정산 — 음악 저작권 수익을 전속작가에게 배분하는 정산
```

- [ ] **Step 8: 잔여 확인 — 바꿔야 할 라벨이 남지 않았는지**

Run: `grep -rn "저작권료 정산" src` (또는 Grep 도구)
Expected: 남는 결과는 **없어야** 한다(모든 "저작권료 정산"이 "해외 저작권료 정산"으로 교체됨). 만약 `해외 저작권료 정산`만 매칭되면 정상(부분일치). 다른 곳에 단독 "저작권료 정산"이 남아 있으면 누락이므로 추가 교체.
주의: `/settlement/new?type=royalty`·`key: 'royalty'`·`RoyaltySettlementPage` 등 라우트/키/식별자는 **남아 있어야 정상**(변경 대상 아님).

- [ ] **Step 9: 타입체크·린트·빌드**

Run: `npm run type-check` · `npx eslint "src/app/(dashboard)/settlement/royalty/page.tsx" src/components/layout/AppSidebar.tsx src/components/layout/SiteHeader.tsx src/components/search/CommandPalette.tsx` · `npm run build`
Expected: 0 error / 빌드 성공.

- [ ] **Step 10: 시각 확인(개발서버, 다크모드)**

dev 서버(`http://localhost:3001`)에서:
1. 사이드바 정산서 하위 메뉴가 **"해외 저작권료 정산"** 으로 표시.
2. 그 메뉴 클릭 → `/settlement/royalty`로 정상 이동(라우트 유지).
3. 페이지 **브레드크럼**과 **h1 헤더**가 "해외 저작권료 정산", 버튼 "새 해외 저작권료 정산", 빈상태 "해외 저작권료 정산 목록…".
4. 검색 팔레트(⌘/Ctrl+K 또는 검색 버튼)에서 "해외 저작권료 정산" 항목이 보이고 클릭 시 이동.

- [ ] **Step 11: Commit (사용자 지시 시에만)**

```bash
git add "src/app/(dashboard)/settlement/royalty/page.tsx" src/components/layout/AppSidebar.tsx src/components/layout/SiteHeader.tsx src/components/search/CommandPalette.tsx
git commit -m "Refactor: '저작권료 정산' 라벨을 '해외 저작권료 정산'으로 변경(메뉴·브레드크럼·헤더·검색, 라우트 유지)"
```

---

## Self-Review

**1. Spec coverage:**
- 사이드바 라벨 → Step 1 ✅
- 브레드크럼 → Step 2 ✅
- 헤더 제목(h1) → Step 4 ✅
- (메모리 규칙) 검색 SCOPES → Step 3 ✅
- (일관성) 버튼·빈상태·주석 → Step 5/6/7 ✅
- 라우트 유지 → Global Constraints + Step 5 주의 + Step 8 ✅

**2. Placeholder scan:** 모든 스텝에 실제 before/after 코드 포함. TBD/모호 표현 없음.

**3. Type consistency:** 시그니처/타입 변경 없음(문자열 리터럴만). `key`/`href`/컴포넌트명 불변 확인.

**의도된 비변경:** `/settlement/royalty`, `/settlement/new?type=royalty`, `key: 'royalty'`, `RoyaltySettlementPage`, `type=royalty` — 라우트/키/식별자는 그대로 둔다.
