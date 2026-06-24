# 홈 피드 개편 + 표 폭 확대 + 매출 비교 버그 수정 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 대표님 피드백을 반영해 ① 홈 피드를 "한눈 요약 대시보드"로 전면 개편(현황 개요 최상단·올해 누적 수입 강조·최근 정산 제거·카테고리 도넛·월별 매출 달력), ② 관리 표 5종의 좌우 폭을 표별로 넓히고, ③ 매출현황 "비교하기" 시 막대와 숫자 라벨이 따로 노는 버그를 고친다.

**Architecture:** 홈 피드는 기존 `aggregateRevenue`(청구서 귀속금액 집계)를 재사용하되 "올해 고정·요약 위주"로 매출현황과 차별화한다. 신규 home 컴포넌트(`HeroRevenueCard`·`CategoryDonut`·`RevenueCalendar`)로 분리하고 `page.tsx`는 조립만 담당한다. 도넛 3분류는 `aggregator.ts`에 순수 분류 헬퍼를 추가해 vitest로 검증한다. 표 폭은 페이지별 `max-w-*` 한 줄 수정. 차트 버그는 `QuarterlyChart`의 값 라벨을 막대와 같은 flex 컬럼(상단)에 배치해 막대 높이 변화와 함께 이동하도록 구조를 바꾼다.

**Tech Stack:** Next.js 16.2.7 (App Router), React 19, TypeScript strict, Tailwind v4(CSS-first 토큰), Zustand, vitest. 차트 라이브러리 없음(순수 SVG/Flexbox + inline style).

## Global Constraints

- TypeScript strict, **`any` 금지**. 들여쓰기 2칸. 주석/문서/커밋 메시지는 **한국어**, 변수·함수명은 영어.
- 컴포넌트 PascalCase, 클라이언트 컴포넌트는 `'use client'`. 상수 UPPER_SNAKE_CASE.
- **색상은 테마 토큰만 사용**(`bg-background`·`bg-card`·`text-foreground`·`text-muted-foreground`·`border-border`·`bg-primary` 등). 하드코딩 색은 라이트/다크 양쪽에서 의미 있는 경우(상태색 초록/빨강)만 `text-emerald-*`/`text-red-*` 같은 표준 유틸로. **홈 피드 배경은 페이지에 별도 배경을 주지 말고 레이아웃의 `--background`(라이트 `#f5f5f8`/다크 자동)를 그대로 상속**한다.
- 금액 포맷은 기존 `formatWon`(원 단위) 사용. 억/백만 축약이 필요하면 별도 헬퍼를 만들되 기존 포맷을 깨지 않는다.
- 정산 로직은 `lib/`의 순수 함수로. Supabase RLS·권한(`requireStaff`)은 기존 패턴 유지.
- **커밋·푸시·머지는 사용자가 명시적으로 지시할 때만.** 자동 금지. `.mcp.json`·`.claude/agent-memory/*`는 절대 커밋하지 않는다.
- 검증 게이트: `npm run type-check` 0 error · `npx eslint <변경파일>` 0 error · `npx vitest run` 전부 통과 · `npm run build` 성공.

---

## File Structure

**신규**
- `src/components/home/HeroRevenueCard.tsx` — 올해 누적 수입 히어로 카드(대형 금액 + 전년대비 + 월별 스파크라인)
- `src/components/home/OverviewKpis.tsx` — 우측 KPI 3타일(정산 완료·관리 저작물·거래처)
- `src/components/home/CategoryDonut.tsx` — 카테고리 도넛(저작권료/용역/기타) + 범례
- `src/components/home/RevenueCalendar.tsx` — 월별 매출 달력(1~12월 막대바 + 금액, +초록/−빨강)
- `src/lib/home/format.ts` — 금액 축약 포맷(`formatCompactWon`)
- `src/lib/revenue/aggregator.test.ts` — 신규 분류/시리즈 헬퍼 vitest

**수정**
- `src/lib/revenue/aggregator.ts` — 도넛 3분류 헬퍼(`classifyDonutCategory`, `buildDonutBuckets`) + 월별 시리즈 헬퍼(`buildMonthlySeries`) 추가
- `src/app/(dashboard)/page.tsx` — 홈 피드 전면 재구성(개요 최상단, 최근 정산 제거)
- `src/components/revenue/QuarterlyChart.tsx` — 비교 버튼 라벨 이동 버그 수정
- `src/app/(dashboard)/admin/clients/page.tsx:144` — `max-w-3xl` → `max-w-5xl`
- `src/app/(dashboard)/staff/page.tsx:204` — `max-w-4xl` → `max-w-6xl`
- `src/app/(dashboard)/admin/accounts/page.tsx:240` — `max-w-5xl` → `max-w-6xl`
- `src/app/(dashboard)/admin/writers/page.tsx:661` — `max-w-6xl` → `max-w-7xl`

---

## 데이터 정의 (확정)

> **홈 피드는 "올해 고정" 요약.** 연도 토글/드릴다운 없음(매출현황과 차별화). 기준 연도 = 현재 연도(예: 2026). 데이터는 `aggregateRevenue(paidInvoices, priceItems)` 결과(`byYear`·`byMonth`·`byCategory`) + 용역정산 합계 + 작가/거래처/저작물 카운트로 구성.

- **올해 누적 수입(히어로)** = `byYear[currentYear]` (청구서 paid 귀속금액 합). 전년대비 = `calcYoY(byYear[cur], byYear[cur-1])`. 스파크라인 = `byMonth[cur-1 … cur-12]`.
- **카테고리 도넛 3분류**(올해):
  - **용역** = Σ 용역정산서 `total_amount` 중 `period_start`의 연도 = currentYear. **(작가지급액 기준 — 용역정산 규모. 대표님 지시: "용역=용역정산 내용".)**
  - **저작권료** = Σ 청구서 귀속금액(올해) 중 도넛분류가 '저작권료'인 항목. (분류 규칙: 아래 헬퍼)
  - **기타** = Σ 청구서 귀속금액(올해) 중 도넛분류가 '기타'인 항목.
  - ⚠️ **의미 주의(코드 주석에 명시):** 용역(작가지급액)과 저작권료/기타(귀속금액)는 금액 성격이 달라 단순 합이 히어로 누적수입과 일치하지 않는다. 도넛 중앙 라벨은 "매출 구성"(세 값의 합)으로 표기하고, 누적수입은 히어로에만 둔다.
- **월별 매출 달력**(올해) = `byMonth[cur-1 … cur-12]`의 월별 귀속금액. 양수 → `+`·초록, 음수 → `−`·빨강.
- **KPI 3타일**:
  - 올해 정산 완료 = 올해 paid 청구서 건수(`byMonth`/invoices에서 카운트) 또는 용역정산 건수. **여기서는 올해 paid 청구서 건수** 사용.
  - 관리 저작물 = `/api/works/writers`의 `count` 합.
  - 거래처 = `/api/clients` 목록 길이.

---

## Task 1: 관리 표 5종 좌우 폭 확대

표별 `max-w-*` 한 줄씩 수정. 독립 작업, 시각 회귀만 검증.

**Files:**
- Modify: `src/app/(dashboard)/admin/clients/page.tsx:144`
- Modify: `src/app/(dashboard)/staff/page.tsx:204`
- Modify: `src/app/(dashboard)/admin/accounts/page.tsx:240`
- Modify: `src/app/(dashboard)/admin/writers/page.tsx:661`

**Interfaces:** Produces 없음(스타일만). Consumes 없음.

- [ ] **Step 1: 거래처DB 폭 확대**

`src/app/(dashboard)/admin/clients/page.tsx` 144행의 표 컨테이너 클래스에서 `max-w-3xl`을 `max-w-5xl`로 변경한다.

```tsx
// 변경 전: <div className="bg-card border border-border rounded-lg overflow-hidden w-full max-w-3xl mx-auto">
<div className="bg-card border border-border rounded-lg overflow-hidden w-full max-w-5xl mx-auto">
```

- [ ] **Step 2: 구성원 폭 확대**

`src/app/(dashboard)/staff/page.tsx` 204행 `max-w-4xl` → `max-w-6xl`.

```tsx
<div className="bg-card border border-border rounded-lg overflow-hidden w-full max-w-6xl mx-auto">
```

- [ ] **Step 3: 계정관리 폭 확대**

`src/app/(dashboard)/admin/accounts/page.tsx` 240행 `max-w-5xl` → `max-w-6xl`.

```tsx
<div className="bg-card border border-border rounded-lg overflow-hidden w-full max-w-6xl mx-auto">
```

- [ ] **Step 4: 작가마스터 폭 확대**

`src/app/(dashboard)/admin/writers/page.tsx` 661행 `max-w-6xl` → `max-w-7xl`.

```tsx
<div className="bg-card border border-border rounded-lg overflow-hidden w-full max-w-7xl mx-auto">
```

> 용역단가(`settlement/service/page.tsx:106`)는 이미 폭 제한이 없어(전체 폭) 변경하지 않는다.

- [ ] **Step 5: 타입체크·린트**

Run: `npm run type-check` · `npx eslint src/app/(dashboard)/admin/clients/page.tsx src/app/(dashboard)/staff/page.tsx src/app/(dashboard)/admin/accounts/page.tsx src/app/(dashboard)/admin/writers/page.tsx`
Expected: 0 error.

- [ ] **Step 6: 시각 확인(개발서버)**

dev 서버에서 각 페이지를 열어 표가 이전보다 넓게(중앙 정렬 유지) 표시되는지 확인. 가로 스크롤이 생기지 않아야 한다.

- [ ] **Step 7: Commit (사용자 지시 시에만)**

```bash
git add "src/app/(dashboard)/admin/clients/page.tsx" "src/app/(dashboard)/staff/page.tsx" "src/app/(dashboard)/admin/accounts/page.tsx" "src/app/(dashboard)/admin/writers/page.tsx"
git commit -m "Style: 관리 표(거래처·구성원·계정·작가) 좌우 폭 표별 확대"
```

---

## Task 2: 매출현황 "비교하기" 라벨 이동 버그 수정

`QuarterlyChart`의 값 라벨이 막대와 다른 컨테이너에 있어, 비교 토글로 막대 높이가 바뀌어도 라벨이 제자리에 남는다. 라벨을 **각 막대와 같은 세로 flex 컬럼의 상단**에 배치해 막대와 함께 이동시킨다.

**Files:**
- Modify: `src/components/revenue/QuarterlyChart.tsx` (분기뷰 라벨/막대 107-146, 월뷰 라벨/막대 148-202)

**Interfaces:**
- Consumes: `data: RevenueData`, `year`, `selectedQuarter`, `compare`, `onSelectQuarter` (props 시그니처 변경 없음 — 내부 마크업만 수정)
- Produces: 없음(시각 동작만 변경)

- [ ] **Step 1: 현재 구조 정독**

`src/components/revenue/QuarterlyChart.tsx`를 열어 분기뷰(약 85-146행)와 월뷰(약 148-202행)에서 ① 값 라벨 `<span>`이 막대 컨테이너 **바깥**(상단 고정)에 있고 ② 막대는 `flex items-end`(또는 `absolute bottom-0`)로 높이만 변하는 현재 구조를 확인한다. 라벨이 막대 top과 연결돼 있지 않은 지점을 특정한다.

- [ ] **Step 2: 분기뷰 — 라벨을 막대 컬럼 상단으로 이동**

각 분기(현재/비교 한 쌍)를 `flex flex-col items-center justify-end h-full` 컬럼으로 감싸고, **값 라벨을 그 컬럼 안에서 막대 바로 위**에 둔다. 막대 묶음은 `flex items-end gap-1`. 이렇게 하면 막대 높이가 커질수록 라벨이 위로 함께 밀린다.

```tsx
{/* 분기 1개 묶음: 라벨(상단) + 막대(현재/비교) — 라벨이 막대 top과 같은 컬럼이라 함께 이동 */}
<div className="flex h-full flex-col items-center justify-end">
  <span className="mb-1 text-[10px] tabular-nums text-muted-foreground transition-all">
    {cur.total > 0 ? formatWon(cur.total) : '-'}
  </span>
  <div className="flex w-full items-end justify-center gap-1">
    {/* 현재 연도 막대 */}
    <div
      className="w-6 rounded-t bg-primary transition-all"
      style={{ height: barHeight(cur.total, maxQuarter) }}
    />
    {/* 비교(전년) 막대 — compare일 때만 */}
    {compare && (
      <div
        className="w-6 rounded-t transition-all"
        style={{ height: barHeight(prev.total, maxQuarter), background: 'var(--chart-bar-compare-from)' }}
      />
    )}
  </div>
</div>
```

> 기존 클래스/색 토큰(`--chart-bar-*`)·`barHeight`·`formatWon`·호버 툴팁 핸들러는 그대로 유지하고 **마크업 중첩 구조만** 위 형태로 바꾼다. 막대 폭/색/선택 강조 로직은 보존한다.

- [ ] **Step 3: 월뷰 — 동일 패턴 적용**

월뷰(1~12월)도 각 월을 `flex flex-col items-center justify-end` 컬럼으로 감싸고 라벨을 막대 위에 둔다. 월뷰가 `position:relative; height:CHART_HEIGHT` + `absolute bottom-0` 막대 구조라면, **막대를 absolute에서 flex 흐름으로 전환**하거나, 라벨도 같은 좌표계(막대 top 기준 `bottom: barHeight + offset`)로 배치한다. 권장: 분기뷰와 동일하게 flex 컬럼 흐름으로 통일.

```tsx
{/* 월 1개: 라벨 + 막대(분기 절반 두께). compare면 전년 막대 병렬 */}
<div className="flex h-full flex-col items-center justify-end">
  <span className="mb-1 text-[9px] tabular-nums text-muted-foreground transition-all">
    {m.total > 0 ? formatWon(m.total) : ''}
  </span>
  <div className="flex items-end justify-center gap-0.5">
    <div className="w-3 rounded-t bg-primary transition-all" style={{ height: barHeight(m.total, maxMonth) }} />
    {compare && (
      <div className="w-3 rounded-t transition-all"
           style={{ height: barHeight(mPrev.total, maxMonth), background: 'var(--chart-bar-compare-from)' }} />
    )}
  </div>
</div>
```

- [ ] **Step 4: 타입체크·린트**

Run: `npm run type-check` · `npx eslint src/components/revenue/QuarterlyChart.tsx`
Expected: 0 error.

- [ ] **Step 5: Playwright 회귀 검증**

매출현황 페이지에서 "비교하기" 토글 ON/OFF를 반복하며, **값 라벨이 막대 상단에 붙어 함께 위아래로 이동**하는지 확인(라벨이 제자리에 남지 않음). 분기뷰·월뷰 모두 확인. `browser_evaluate`로 라벨 요소의 `getBoundingClientRect().top`이 compare 토글 시 막대 높이에 따라 변하는지 측정.

- [ ] **Step 6: Commit (사용자 지시 시에만)**

```bash
git add src/components/revenue/QuarterlyChart.tsx
git commit -m "Fix: 매출현황 비교 토글 시 값 라벨이 막대와 함께 이동하도록 수정"
```

---

## Task 3: aggregator 도넛 3분류 + 월별 시리즈 헬퍼 (TDD)

홈 도넛/달력/히어로가 쓸 순수 헬퍼를 `aggregator.ts`에 추가하고 vitest로 검증. UI 없이 로직만.

**Files:**
- Modify: `src/lib/revenue/aggregator.ts`
- Create: `src/lib/revenue/aggregator.test.ts`

**Interfaces:**
- Consumes: 기존 `RevenueData`(`byMonth`·`byCategory`·`byYear`), `REVENUE_CATEGORIES`, `PriceItem`/`InvoiceItem` 타입, `calcItemBreakdown`(`src/lib/invoice/calculator.ts`).
- Produces (later tasks 사용):
  - `type DonutBucket = '저작권료' | '용역' | '기타'`
  - `classifyDonutCategory(category: string, itemName: string): Exclude<DonutBucket, '용역'>` — 청구서 항목을 '저작권료'|'기타'로 분류(용역은 별도 소스).
  - `buildDonutBuckets(byCategory: RevenueData['byCategory'], year: number, serviceTotal: number): { bucket: DonutBucket; amount: number }[]` — 도넛 3버킷 금액 배열.
  - `buildMonthlySeries(byMonth: RevenueData['byMonth'], year: number): { month: number; total: number }[]` — 1~12월 시리즈(없으면 0).

- [ ] **Step 1: 실패 테스트 작성**

`src/lib/revenue/aggregator.test.ts` 생성.

```ts
import { describe, it, expect } from 'vitest';
import { classifyDonutCategory, buildDonutBuckets, buildMonthlySeries } from './aggregator';

describe('classifyDonutCategory', () => {
  it("category가 '기타'면 기타", () => {
    expect(classifyDonutCategory('기타', '레슨')).toBe('기타');
  });
  it("커스텀(빈 category)이면 기타", () => {
    expect(classifyDonutCategory('커스텀', '임의항목')).toBe('기타');
  });
  it("그 외 카테고리는 저작권료", () => {
    expect(classifyDonutCategory('앨범', '정규앨범')).toBe('저작권료');
    expect(classifyDonutCategory('광고', 'CF 음악')).toBe('저작권료');
  });
});

describe('buildDonutBuckets', () => {
  it('저작권료/용역/기타 3버킷을 순서대로 반환하고 용역은 serviceTotal', () => {
    const byCategory = {
      '앨범': { 2026: 1000 },
      '기타': { 2026: 300 },
      '커스텀': { 2026: 200 },
    } as Record<string, Record<number, number>>;
    const buckets = buildDonutBuckets(byCategory, 2026, 500);
    expect(buckets).toEqual([
      { bucket: '저작권료', amount: 1000 },
      { bucket: '용역', amount: 500 },
      { bucket: '기타', amount: 500 },
    ]);
  });
  it('해당 연도 데이터 없으면 0', () => {
    expect(buildDonutBuckets({}, 2026, 0)).toEqual([
      { bucket: '저작권료', amount: 0 },
      { bucket: '용역', amount: 0 },
      { bucket: '기타', amount: 0 },
    ]);
  });
});

describe('buildMonthlySeries', () => {
  it('1~12월을 채우고 없는 달은 0', () => {
    const byMonth = { '2026-1': { total: 100, count: 1 }, '2026-3': { total: 300, count: 2 } } as RevenueDataMonth;
    const series = buildMonthlySeries(byMonth as never, 2026);
    expect(series).toHaveLength(12);
    expect(series[0]).toEqual({ month: 1, total: 100 });
    expect(series[1]).toEqual({ month: 2, total: 0 });
    expect(series[2]).toEqual({ month: 3, total: 300 });
  });
});

type RevenueDataMonth = Record<string, { total: number; count: number }>;
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run src/lib/revenue/aggregator.test.ts`
Expected: FAIL — `classifyDonutCategory`/`buildDonutBuckets`/`buildMonthlySeries` is not exported.

- [ ] **Step 3: 헬퍼 구현**

`src/lib/revenue/aggregator.ts` 하단에 추가. 기존 `REVENUE_CATEGORIES`·`byCategory` 구조를 그대로 사용한다.

```ts
// ── 홈 피드 도넛/달력 헬퍼 ─────────────────────────────────────────
// 도넛 3분류. ⚠️ 용역은 청구서가 아니라 용역정산서(작가지급액) 합계에서 옴(대표님 지시).
// 저작권료/기타는 청구서 귀속금액에서 분류. 금액 성격이 달라 단순 합은 '매출 구성'이지 누적수입이 아님.
export type DonutBucket = '저작권료' | '용역' | '기타';

// 청구서 항목 카테고리 → 저작권료|기타 (용역은 별도 소스라 여기서 분류하지 않음)
export function classifyDonutCategory(
  category: string,
  _itemName: string,
): Exclude<DonutBucket, '용역'> {
  if (category === '기타' || category === '커스텀') return '기타';
  return '저작권료';
}

// 도넛 3버킷 금액(저작권료·용역·기타 순). serviceTotal = 해당 연도 용역정산 합계.
export function buildDonutBuckets(
  byCategory: RevenueData['byCategory'],
  year: number,
  serviceTotal: number,
): { bucket: DonutBucket; amount: number }[] {
  let royalty = 0;
  let etc = 0;
  for (const category of Object.keys(byCategory)) {
    const amount = byCategory[category]?.[year] ?? 0;
    if (amount === 0) continue;
    if (classifyDonutCategory(category, '') === '기타') etc += amount;
    else royalty += amount;
  }
  return [
    { bucket: '저작권료', amount: royalty },
    { bucket: '용역', amount: serviceTotal },
    { bucket: '기타', amount: etc },
  ];
}

// 1~12월 매출 시리즈(없는 달은 0)
export function buildMonthlySeries(
  byMonth: RevenueData['byMonth'],
  year: number,
): { month: number; total: number }[] {
  const series: { month: number; total: number }[] = [];
  for (let month = 1; month <= 12; month++) {
    series.push({ month, total: byMonth[`${year}-${month}`]?.total ?? 0 });
  }
  return series;
}
```

> `classifyDonutCategory`의 두 번째 인자는 추후 항목명 기반 세분화 여지를 위해 받아두되 현재 미사용(`_itemName`). 시그니처를 미리 고정해 호출부 변경을 막는다.

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run src/lib/revenue/aggregator.test.ts`
Expected: PASS (전부 green).

- [ ] **Step 5: 전체 vitest·타입체크**

Run: `npx vitest run` · `npm run type-check`
Expected: 기존 테스트 포함 전부 통과, 0 error.

- [ ] **Step 6: Commit (사용자 지시 시에만)**

```bash
git add src/lib/revenue/aggregator.ts src/lib/revenue/aggregator.test.ts
git commit -m "Feat: 홈 도넛 3분류·월별 시리즈 집계 헬퍼 추가(+테스트)"
```

---

## Task 4: 금액 축약 포맷 헬퍼 (TDD)

히어로/도넛/달력에서 쓰는 억·백만 축약 표기.

**Files:**
- Create: `src/lib/home/format.ts`
- Create: `src/lib/home/format.test.ts`

**Interfaces:**
- Produces: `formatCompactWon(won: number): string` — 1.84억 / 49.9M(백만) 규칙. 음수는 `-` 유지.

- [ ] **Step 1: 실패 테스트**

```ts
import { describe, it, expect } from 'vitest';
import { formatCompactWon } from './format';

describe('formatCompactWon', () => {
  it('1억 이상은 억 단위 소수1', () => {
    expect(formatCompactWon(184_932_500)).toBe('1.8억');
  });
  it('백만~1억 미만은 M(백만)', () => {
    expect(formatCompactWon(13_200_000)).toBe('13.2M');
    expect(formatCompactWon(49_900_000)).toBe('49.9M');
  });
  it('백만 미만은 천 단위 콤마 원', () => {
    expect(formatCompactWon(840_000)).toBe('840,000원');
  });
  it('음수 부호 유지', () => {
    expect(formatCompactWon(-2_400_000)).toBe('-2.4M');
  });
  it('0', () => {
    expect(formatCompactWon(0)).toBe('0원');
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run src/lib/home/format.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: 구현**

```ts
// 금액 축약 포맷 — 홈 피드 히어로/도넛/달력 공용. 억/백만(M)/원 3단계.
export function formatCompactWon(won: number): string {
  const sign = won < 0 ? '-' : '';
  const abs = Math.abs(won);
  if (abs >= 100_000_000) return `${sign}${(abs / 100_000_000).toFixed(1)}억`;
  if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(1)}M`;
  if (abs === 0) return '0원';
  return `${sign}${abs.toLocaleString('ko-KR')}원`;
}
```

- [ ] **Step 4: 통과 확인**

Run: `npx vitest run src/lib/home/format.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit (사용자 지시 시에만)**

```bash
git add src/lib/home/format.ts src/lib/home/format.test.ts
git commit -m "Feat: 홈 피드 금액 축약 포맷 헬퍼(억/백만/원) 추가"
```

---

## Task 5: HeroRevenueCard 컴포넌트

올해 누적 수입 히어로(대형 금액 + 전년대비 + 월별 스파크라인).

**Files:**
- Create: `src/components/home/HeroRevenueCard.tsx`

**Interfaces:**
- Consumes: `formatCompactWon`(Task 4), `formatWon`(기존 `src/lib/utils` 또는 기존 위치), `calcYoY`(`aggregator.ts`).
- Produces:
  ```ts
  interface HeroRevenueCardProps {
    year: number;
    total: number;            // 올해 누적 귀속금액
    prevTotal: number;        // 전년 동기 누적
    monthly: { month: number; total: number }[]; // 스파크라인용 1~12월
  }
  export function HeroRevenueCard(props: HeroRevenueCardProps): JSX.Element
  ```

- [ ] **Step 1: 컴포넌트 작성**

바이올렛 그라디언트 히어로. 배경은 `bg-primary`(라이트에서 globals.css가 그라디언트로 처리) + `text-primary-foreground`. 스파크라인은 inline-style 막대(시안 검증 완료 형태).

```tsx
'use client';

// 홈 피드 히어로 — 올해 누적 수입 강조. 전년대비 YoY + 월별 스파크라인.
import { formatWon } from '@/lib/utils';
import { calcYoY } from '@/lib/revenue/aggregator';

interface HeroRevenueCardProps {
  year: number;
  total: number;
  prevTotal: number;
  monthly: { month: number; total: number }[];
}

export function HeroRevenueCard({ year, total, prevTotal, monthly }: HeroRevenueCardProps) {
  const yoy = calcYoY(total, prevTotal); // number(%) — 양수=증가
  const max = Math.max(1, ...monthly.map((m) => m.total));
  const avg = total > 0 ? Math.round(total / 12) : 0;

  return (
    <section className="relative overflow-hidden rounded-2xl bg-primary px-7 py-6 text-primary-foreground shadow-sm">
      <div className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full bg-white/10" />
      <p className="text-sm font-semibold opacity-90">올해 누적 수입 ({year})</p>
      <p className="mt-1.5 text-[42px] font-extrabold leading-none tracking-tight">{formatWon(total)}</p>
      <p className="mt-2 text-[13px] font-semibold opacity-95">
        {yoy >= 0 ? '▲' : '▼'} 전년 동기 대비 {yoy >= 0 ? '+' : ''}{yoy.toFixed(1)}% · 월평균 {formatWon(avg)}
      </p>
      <div className="mt-4 flex h-12 items-end gap-1.5">
        {monthly.map((m) => (
          <div
            key={m.month}
            className="flex-1 rounded-t bg-white/45"
            style={{ height: `${Math.max(6, (m.total / max) * 100)}%` }}
            title={`${m.month}월 ${formatWon(m.total)}`}
          />
        ))}
      </div>
    </section>
  );
}
```

> `formatWon`의 정확한 import 경로는 기존 홈/매출 페이지의 import를 따른다(예: `@/lib/utils` 또는 `@/lib/invoice/format`). 구현 시 기존 사용처에서 확인 후 동일 경로 사용.

- [ ] **Step 2: 타입체크·린트**

Run: `npm run type-check` · `npx eslint src/components/home/HeroRevenueCard.tsx`
Expected: 0 error.

- [ ] **Step 3: Commit (사용자 지시 시에만)**

```bash
git add src/components/home/HeroRevenueCard.tsx
git commit -m "Feat: 홈 피드 히어로(올해 누적 수입) 카드 컴포넌트"
```

---

## Task 6: OverviewKpis 컴포넌트

정산 완료·관리 저작물·거래처 KPI 3타일(세로 스택).

**Files:**
- Create: `src/components/home/OverviewKpis.tsx`

**Interfaces:**
- Produces:
  ```ts
  interface OverviewKpisProps {
    settledCount: number;   // 올해 정산 완료(=올해 paid 청구서 건수)
    settledRatio: number;   // 0~100 (%) — 전체 대비
    worksCount: number;     // 관리 저작물
    writersCount: number;   // 전속작가
    clientsCount: number;   // 거래처
    clientsDelta: number;   // 이번 분기 증감
  }
  export function OverviewKpis(props: OverviewKpisProps): JSX.Element
  ```

- [ ] **Step 1: 컴포넌트 작성**

각 타일은 `bg-card border border-border rounded-xl`. 아이콘은 lucide(`CheckCircle2`·`Music`·`Building2`). 상태색은 `text-emerald-500`/`text-muted-foreground`.

```tsx
'use client';

// 홈 피드 현황 개요 KPI 3타일(히어로 우측 세로 스택).
import { CheckCircle2, Music, Building2 } from 'lucide-react';

interface OverviewKpisProps {
  settledCount: number;
  settledRatio: number;
  worksCount: number;
  writersCount: number;
  clientsCount: number;
  clientsDelta: number;
}

export function OverviewKpis({
  settledCount, settledRatio, worksCount, writersCount, clientsCount, clientsDelta,
}: OverviewKpisProps) {
  const tiles = [
    { Icon: CheckCircle2, label: '올해 정산 완료', value: `${settledCount}건`, right: `${settledRatio.toFixed(1)}%`, rightCls: 'text-emerald-500' },
    { Icon: Music, label: '관리 저작물', value: `${worksCount}곡`, right: `${writersCount}명`, rightCls: 'text-muted-foreground' },
    { Icon: Building2, label: '거래처', value: `${clientsCount}곳`, right: clientsDelta > 0 ? `+${clientsDelta}` : `${clientsDelta}`, rightCls: clientsDelta > 0 ? 'text-emerald-500' : 'text-muted-foreground' },
  ];
  return (
    <div className="flex h-full flex-col gap-3.5">
      {tiles.map(({ Icon, label, value, right, rightCls }) => (
        <div key={label} className="flex flex-1 items-center gap-3 rounded-xl border border-border bg-card px-4 py-3.5 shadow-sm">
          <div className="grid h-9 w-9 flex-none place-items-center rounded-lg bg-primary/10 text-primary">
            <Icon className="h-4.5 w-4.5" />
          </div>
          <div>
            <p className="text-[11.5px] font-semibold text-muted-foreground">{label}</p>
            <p className="mt-0.5 text-lg font-extrabold text-foreground">{value}</p>
          </div>
          <span className={`ml-auto text-[11px] font-bold ${rightCls}`}>{right}</span>
        </div>
      ))}
    </div>
  );
}
```

> lucide 아이콘 크기 `h-4.5`가 프로젝트 Tailwind에 없으면 `h-4 w-4`로 대체. 구현 시 확인.

- [ ] **Step 2: 타입체크·린트**

Run: `npm run type-check` · `npx eslint src/components/home/OverviewKpis.tsx`
Expected: 0 error.

- [ ] **Step 3: Commit (사용자 지시 시에만)**

```bash
git add src/components/home/OverviewKpis.tsx
git commit -m "Feat: 홈 피드 현황 개요 KPI 3타일 컴포넌트"
```

---

## Task 7: CategoryDonut 컴포넌트

저작권료/용역/기타 도넛 + 범례.

**Files:**
- Create: `src/components/home/CategoryDonut.tsx`

**Interfaces:**
- Consumes: `DonutBucket`·`buildDonutBuckets` 결과 타입, `formatCompactWon`.
- Produces:
  ```ts
  interface CategoryDonutProps {
    buckets: { bucket: '저작권료' | '용역' | '기타'; amount: number }[];
  }
  export function CategoryDonut(props: CategoryDonutProps): JSX.Element
  ```

- [ ] **Step 1: 컴포넌트 작성**

SVG `stroke-dasharray` 도넛(시안 검증 형태). 각 세그먼트 비율 = amount/total. 색: 저작권료 `var(--primary)`, 용역 `#34d399`, 기타 `#fbbf24`. 중앙 라벨 = "매출 구성" + 합계(축약). 빈 데이터(합 0)면 회색 트랙만.

```tsx
'use client';

// 홈 피드 카테고리 도넛 — 저작권료/용역/기타 구성.
// ⚠️ 용역은 용역정산(작가지급액) 합계, 저작권료/기타는 청구서 귀속금액(성격 상이).
// 중앙 라벨은 '매출 구성'(세 값 합)으로, 히어로 '누적 수입'과 구분.
import { formatCompactWon } from '@/lib/home/format';

interface CategoryDonutProps {
  buckets: { bucket: '저작권료' | '용역' | '기타'; amount: number }[];
}

const COLORS: Record<string, string> = {
  저작권료: 'var(--primary)',
  용역: '#34d399',
  기타: '#fbbf24',
};
const R = 15.915; // 둘레 100 정규화 반지름
const CIRC = 100;

export function CategoryDonut({ buckets }: CategoryDonutProps) {
  const total = buckets.reduce((s, b) => s + b.amount, 0);
  let offset = 25; // 12시 방향 시작
  return (
    <section className="rounded-xl border border-border bg-card shadow-sm">
      <div className="px-5 pt-4">
        <h3 className="text-sm font-extrabold text-foreground">카테고리별 매출</h3>
        <p className="mt-0.5 text-[11.5px] text-muted-foreground">저작권료 · 용역 · 기타</p>
      </div>
      <div className="flex items-center gap-5 px-5 pb-6 pt-4">
        <svg width="120" height="120" viewBox="0 0 42 42" className="flex-none">
          <circle cx="21" cy="21" r={R} fill="none" stroke="var(--muted)" strokeWidth="6" />
          {total > 0 && buckets.map((b) => {
            const pct = (b.amount / total) * CIRC;
            const dash = `${pct} ${CIRC - pct}`;
            const seg = (
              <circle key={b.bucket} cx="21" cy="21" r={R} fill="none"
                stroke={COLORS[b.bucket]} strokeWidth="6"
                strokeDasharray={dash} strokeDashoffset={offset} />
            );
            offset -= pct;
            return seg;
          })}
          <text x="21" y="20" textAnchor="middle" fontSize="4.4" fontWeight="800" fill="var(--foreground)">
            {formatCompactWon(total)}
          </text>
          <text x="21" y="25.5" textAnchor="middle" fontSize="2.5" fill="var(--muted-foreground)">매출 구성</text>
        </svg>
        <div className="flex flex-col gap-3 text-[12.5px]">
          {buckets.map((b) => (
            <div key={b.bucket} className="flex min-w-[150px] items-center gap-2">
              <span className="h-2.5 w-2.5 rounded" style={{ background: COLORS[b.bucket] }} />
              <span className="text-foreground">{b.bucket}</span>
              <b className="ml-auto font-extrabold text-foreground">{formatCompactWon(b.amount)}</b>
              <small className="ml-1.5 text-[11px] text-muted-foreground">
                {total > 0 ? Math.round((b.amount / total) * 100) : 0}%
              </small>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: 타입체크·린트**

Run: `npm run type-check` · `npx eslint src/components/home/CategoryDonut.tsx`
Expected: 0 error.

- [ ] **Step 3: Commit (사용자 지시 시에만)**

```bash
git add src/components/home/CategoryDonut.tsx
git commit -m "Feat: 홈 피드 카테고리 도넛(저작권료/용역/기타) 컴포넌트"
```

---

## Task 8: RevenueCalendar 컴포넌트

월별 매출 달력(1~12월, 막대바 + 금액, +초록/−빨강).

**Files:**
- Create: `src/components/home/RevenueCalendar.tsx`

**Interfaces:**
- Consumes: `formatCompactWon`.
- Produces:
  ```ts
  interface RevenueCalendarProps {
    monthly: { month: number; total: number }[]; // 1~12월
  }
  export function RevenueCalendar(props: RevenueCalendarProps): JSX.Element
  ```

- [ ] **Step 1: 컴포넌트 작성**

2열 그리드 월 행. 트랙 막대 = `total/max`(양수만 막대 폭, 음수는 빨강 짧은 막대). 금액 색: 양수 `text-emerald-600`, 음수 `text-red-600`. 누적수입 요약 박스는 두지 않는다(히어로에 있음).

```tsx
'use client';

// 홈 피드 매출 달력 — 월별 순매출. +수입(초록)/−환입(빨강). 누적 박스 없음(히어로가 담당).
import { formatCompactWon } from '@/lib/home/format';

interface RevenueCalendarProps {
  monthly: { month: number; total: number }[];
}

export function RevenueCalendar({ monthly }: RevenueCalendarProps) {
  const max = Math.max(1, ...monthly.map((m) => Math.abs(m.total)));
  return (
    <section className="rounded-xl border border-border bg-card px-5 py-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-extrabold text-foreground">매출 달력</h3>
        <span className="text-[11px] font-semibold text-muted-foreground">월별 순매출 · +수입(초록) / −환입(빨강)</span>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-2">
        {monthly.map((m) => {
          const neg = m.total < 0;
          const pct = Math.max(0, (Math.abs(m.total) / max) * 100);
          return (
            <div key={m.month} className="flex items-center rounded-lg border border-border bg-background px-3 py-2">
              <span className="w-8 flex-none text-[11.5px] font-bold text-muted-foreground">{m.month}월</span>
              <div className="mx-2.5 h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${pct}%`, background: neg ? 'linear-gradient(90deg,#f87171,#fca5a5)' : 'linear-gradient(90deg,var(--primary),#b9a6ff)' }}
                />
              </div>
              <span className={`w-14 flex-none text-right text-[11px] font-extrabold ${neg ? 'text-red-600' : 'text-emerald-600'}`}>
                {m.total > 0 ? '+' : ''}{formatCompactWon(m.total)}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
```

- [ ] **Step 2: 타입체크·린트**

Run: `npm run type-check` · `npx eslint src/components/home/RevenueCalendar.tsx`
Expected: 0 error.

- [ ] **Step 3: Commit (사용자 지시 시에만)**

```bash
git add src/components/home/RevenueCalendar.tsx
git commit -m "Feat: 홈 피드 월별 매출 달력 컴포넌트"
```

---

## Task 9: 홈 피드 page.tsx 전면 재구성 (조립)

데이터 페치 + 집계 + 컴포넌트 조립. 최근 정산·이달 수입·분기 진행카드 제거, 현황 개요 최상단.

**Files:**
- Modify: `src/app/(dashboard)/page.tsx`

**Interfaces:**
- Consumes: `HeroRevenueCard`·`OverviewKpis`·`CategoryDonut`·`RevenueCalendar`(Task 5-8), `aggregateRevenue`·`buildDonutBuckets`·`buildMonthlySeries`·`calcYoY`(Task 3), 기존 API.
- Produces: 없음(최종 화면).

- [ ] **Step 1: 데이터 소스 정리**

기존 fetch를 매출현황과 동일 소스로 교체/보강한다:
- `GET /api/invoices?status=paid` → paid 청구서(+items)
- `GET /api/price-items?all=1` → 카테고리 매핑
- `GET /api/settlements/service` → 용역정산(용역 도넛값)
- `GET /api/writers` → 전속작가 수
- `GET /api/works/writers` → 관리 저작물 수(count 합)
- `GET /api/clients` → 거래처 수

> `/api/clients` 응답 형태(`{ clients: [...] }` 등)는 거래처 목록 페이지의 fetch에서 확인 후 동일하게 파싱한다.

- [ ] **Step 2: 집계 useMemo 작성**

```tsx
const now = new Date();
const year = now.getFullYear();

const home = useMemo(() => {
  const data = aggregateRevenue(paidInvoices, priceItems); // byYear/byMonth/byCategory
  const total = data.byYear[year] ?? 0;
  const prevTotal = data.byYear[year - 1] ?? 0;
  const monthly = buildMonthlySeries(data.byMonth, year);

  // 용역 = 올해 용역정산 합계(period_start 연도 기준)
  const serviceTotal = serviceSettlements
    .filter((s) => new Date(s.period_start).getFullYear() === year)
    .reduce((sum, s) => sum + (s.total_amount ?? 0), 0);

  const buckets = buildDonutBuckets(data.byCategory, year, serviceTotal);

  // 올해 정산 완료 건수/비율
  const paidThisYear = paidInvoices.filter((inv) => new Date(inv.invoice_date).getFullYear() === year);
  const settledCount = paidThisYear.length;
  const settledRatio = paidInvoices.length > 0 ? (settledCount / paidInvoices.length) * 100 : 0;

  return { total, prevTotal, monthly, buckets, settledCount, settledRatio };
}, [paidInvoices, priceItems, serviceSettlements, year]);

const worksCount = useMemo(() => workGroups.reduce((s, w) => s + (w.count ?? 0), 0), [workGroups]);
```

- [ ] **Step 3: 레이아웃 조립(개요 최상단)**

시안(`home-mockup-final.html`) 구조: 상단 히어로(2/3)+KPI(1/3), 하단 도넛(1fr)+달력(1.45fr). 페이지 배경은 레이아웃 상속(별도 배경 금지). `max-w` 없이 전체 폭(매출현황과 동일).

```tsx
return (
  <div className="space-y-5">
    {/* 페이지 헤더 */}
    <div className="flex items-end justify-between">
      <div>
        <h1 className="text-xl font-extrabold text-foreground">홈 피드</h1>
        <p className="mt-1 text-[13px] text-muted-foreground">프리즘 필터 뮤직그룹 · {year}년 경영 현황 한눈에 보기</p>
      </div>
    </div>

    {/* 1) 현황 개요 — 최상단 첫 순서 */}
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.9fr_1fr]">
      <HeroRevenueCard year={year} total={home.total} prevTotal={home.prevTotal} monthly={home.monthly} />
      <OverviewKpis
        settledCount={home.settledCount}
        settledRatio={home.settledRatio}
        worksCount={worksCount}
        writersCount={writers.length}
        clientsCount={clients.length}
        clientsDelta={0 /* 분기 증감 산출 가능 시 대체 */}
      />
    </div>

    {/* 2) 카테고리 도넛 + 매출 달력 */}
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1.45fr]">
      <CategoryDonut buckets={home.buckets} />
      <RevenueCalendar monthly={home.monthly} />
    </div>
  </div>
);
```

- [ ] **Step 4: 기존 잔재 제거**

`page.tsx`에서 ① 이달 수입(overview의 `thisMonthRevenue` 항목, 라인 ~101) ② 분기별 정산 진행 카드(라인 ~155-186) ③ 최근 정산 테이블(라인 ~189-226) 및 관련 `recent`/미사용 state·import를 삭제한다. 사용하지 않게 된 fetch(`/api/settlements/service`는 용역 도넛으로 계속 사용하므로 유지)와 `Wallet` 등 미사용 아이콘 import 정리.

- [ ] **Step 5: 로딩/빈 상태**

로딩 스피너(기존 패턴 유지). paid 청구서가 0건이면 히어로는 0원, 도넛/달력은 빈(0) 상태로 자연스럽게 렌더되는지 확인(별도 "데이터 없음" 분기 불필요).

- [ ] **Step 6: 타입체크·린트**

Run: `npm run type-check` · `npx eslint "src/app/(dashboard)/page.tsx"`
Expected: 0 error. (eslint `react-hooks/set-state-in-effect`는 기존 프로젝트 패턴대로 async fetch 줄에 한정 `eslint-disable-next-line`)

- [ ] **Step 7: Commit (사용자 지시 시에만)**

```bash
git add "src/app/(dashboard)/page.tsx"
git commit -m "Feat: 홈 피드 개편(현황 개요 최상단·올해 누적 수입·카테고리 도넛·매출 달력, 최근 정산 제거)"
```

---

## Task 10: 통합 검증 (Playwright + 빌드)

**Files:** 없음(검증 전용).

- [ ] **Step 1: 빌드·테스트·타입 전체**

Run: `npm run type-check` · `npx vitest run` · `npm run build`
Expected: 0 error / 전체 통과 / 빌드 성공.

- [ ] **Step 2: 홈 피드 Playwright 확인(인증 ADMIN 세션, 포트 3001)**

확인 항목:
1. **현황 개요가 최상단 첫 순서** — 히어로(올해 누적 수입) + KPI 3타일이 맨 위.
2. **올해 누적 수입 강조** — 큰 금액 표시, 전년대비 % 노출. "이달 수입"·"최근 정산"·"분기 진행 카드"가 **없음**.
3. **카테고리 도넛** — 저작권료/용역/기타 3분류 + 범례·퍼센트. 중앙 라벨 "매출 구성".
4. **매출 달력** — 1~12월 막대바 + 금액, 양수 초록 `+`, 음수 빨강 `−`.
5. **배경** — 페이지가 별도 배경 없이 ERP 캔버스(라이트 `#f5f5f8`/다크 자동)를 그대로 사용. 다크 모드 토글 시 카드/텍스트/도넛 토큰이 정상 대비.
6. **매출현황과 시각적으로 구분** — 토글/드롭다운/상세 막대차트 없음(요약 전용).

- [ ] **Step 3: 표 폭·비교버그 동시 회귀**

- 거래처DB·구성원·계정관리·작가마스터에서 표가 넓어졌는지(가로 스크롤 없음).
- 매출현황 비교 토글 시 값 라벨이 막대와 함께 이동(Task 2).

- [ ] **Step 4: 최종 보고**

변경 요약 + 검증 결과(타입/테스트/빌드/Playwright)를 한국어로 보고. **커밋/푸시/머지는 사용자가 지시할 때만.**

---

## Self-Review (작성자 점검 결과)

**1. Spec coverage**
- 홈 피드 "매출현황과 다름없음" 해소 → Task 9(요약 전용·토글 없음). ✅
- 이달 수입 → 올해 누적, 최근 정산 제거 → Task 9 Step 4. ✅
- 현황 개요 최상단 → Task 9 Step 3(첫 그리드). ✅
- 카테고리 도넛(저작권료/용역/기타) → Task 3·7, 용역=용역정산(대표님 지시 반영). ✅
- 우측 달력(+초록/−빨강) → Task 8. ✅
- 시안 3개 미리보기 후 선택 → 사전 완료(B+C 하이브리드 확정, `home-mockup-final.html`). ✅
- 표 폭 확대 → Task 1(표별 개별). ✅
- 매출현황 비교 라벨 버그 → Task 2. ✅
- 배경 ERP 테마 일치 → Global Constraints + Task 9 Step 3 + Task 10 Step 2-5. ✅

**2. Placeholder scan** — 모든 코드 스텝에 실제 코드 포함. import 경로 미확정 2건(`formatWon`, `/api/clients` 응답형)은 "구현 시 기존 사용처 확인" 지시로 명시(추정 금지). 

**3. Type consistency** — `DonutBucket`/`buildDonutBuckets`/`buildMonthlySeries`/`formatCompactWon`/각 컴포넌트 Props 시그니처가 Task 3·4 정의와 Task 5-9 사용처에서 일치.

**미해결 의미 이슈(구현 중 대표 확인 권장):** 도넛 '용역'은 용역정산(작가지급액) 합계라 저작권료/기타(귀속금액)와 금액 성격이 달라 도넛 합 ≠ 히어로 누적수입. 본 계획은 대표님 지시("용역=용역정산 내용")를 그대로 반영하고 중앙 라벨을 "매출 구성"으로 분리 표기해 혼동을 줄였다. 렌더 결과 검토 후 정의 조정 가능.
