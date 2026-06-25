# 용역 단가표(프라이스 테이블) 개편 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 용역 단가표를 회사 공식 PDF(2026 프라이스테이블 최종 내부용 v1)와 1:1로 일치시킨다. ① 표 값 컬럼을 PDF와 동일한 3개(희망청구가 / 수수료 / 작가 실수령액)로 정리하고 '작가지급액(방어선)' 컬럼을 제거한다. ② 수수료율을 카테고리 기준(밴드·밴드(플레디스)=20%, 그 외=30%)으로 적용한다. ③ 작가 실수령액을 `희망청구가 × (1 − fee_rate)`로 자동계산해 표시한다. ④ 행 삭제 UX를 작가 마스터처럼 행별 "액션" 컬럼(삭제 확인 → 휴지통 이동)으로 바꾸고 선택 체크박스·상태 토글 컬럼을 제거한다. ⑤ 추가폼에서 작가지급액 입력칸을 제거하고 "취소" 버튼을 추가한다. ⑥ `price_items` 데이터를 전량 삭제 후 새 PDF 단가표로 재시드한다.

**Architecture:** `price_items`를 단일 진실원천(single source of truth)으로 유지한다. 수수료/실수령 계산 규칙은 `lib/invoice/calculator.ts`의 공용 헬퍼 한 곳에만 정의(DRY)하고, 단가표 페이지·청구서·홈피드가 동일 헬퍼를 재사용한다. **계산 기준 자체가 바뀐다**: 현재 코드는 수수료/실수령을 `writer_base_pay` 기준으로 계산하지만, PDF 표는 `희망청구가(billing_price)` 기준이다 — 새 헬퍼는 billing_price 기준으로 계산한다. 카테고리→수수료율 매핑(`feeRateForCategory`)도 calculator.ts에 한 번만 정의한다. 데이터 변경은 신규 마이그레이션(`022_price_table_reseed.sql`)으로 기존 행 전량 삭제 후 INSERT하며, `invoice_items.price_item_id` FK는 `ON DELETE SET NULL`(012에서 설정됨)이라 과거 청구서 스냅샷은 보존된다.

**Tech Stack:** Next.js 16 App Router(`'use client'` 페이지), React 19, TypeScript strict, Tailwind v4, Supabase(PostgreSQL), zod v4, Vitest(단위테스트), Playwright(E2E 검증).

## Global Constraints

- `any` 타입 금지, TypeScript strict 모드 — 모든 타입 명시.
- 들여쓰기 2칸. 컴포넌트 PascalCase, 변수/함수 camelCase, 상수 UPPER_SNAKE_CASE.
- 주석은 한국어, 자명한 코드엔 생략.
- **중복 코드 절대 금지(DRY):** fee_rate 결정·수수료·실수령 계산은 `lib/invoice/calculator.ts`의 공용 헬퍼로 **한 번만** 정의해 모든 소비처가 재사용한다. 페이지/컴포넌트 안에서 `× 0.2`, `× 0.3`, `× (1 - fee)` 같은 인라인 산식을 복제하지 않는다.
- **수수료율 규칙(PDF 기준):** 카테고리가 `밴드` 또는 `밴드(플레디스)` → `0.20`(20%), 그 외 전부 → `0.30`(30%). 단가표의 수수료 컬럼 라벨도 그룹에 따라 밴드 그룹="밴드 수수료 (20%)", 그 외="관리 수수료 (30%)".
- **절사 규칙:** 기존 calculator.ts 방식 유지 — `Math.trunc`(0 방향 절사).
- 권한: 조회 ADMIN/STAFF(`requireStaff()`), 수정/삭제 ADMIN(`requireStaff(true)`). 클라이언트는 `useAuthStore().user?.role === 'ADMIN'`으로 편집 UI 노출.
- 기존 청구서(`invoice_items.price_item_id` FK = `ON DELETE SET NULL`) 보존 — 재시드로 과거 청구서가 깨지면 안 된다(Task 1 영향 분석 Step 필수).
- soft delete·휴지통(복구/영구삭제)·`deleted_at`은 **이미 구현됨** — 건드리지 말고 재사용만 한다.
- 검증: `npm run type-check` · `npx eslint .` · `npm run build` 0 error. 계산 로직은 TDD(실패 테스트 → 구현 → 통과). 마이그레이션 적용 후 Playwright(인증 세션)로 표/추가폼/행 액션삭제/휴지통 회귀 확인.
- 커밋/푸시/머지는 **사용자가 명시적으로 지시할 때만**(자동 금지).
- **범위 외(추후):** websocket/Realtime 푸시 실시간. "홈피드/정산서/청구서 실시간 반영"은 각 화면이 `price_items`를 재fetch할 때 반영되는 현재 구조로 충족한다(Task 5에서 회귀만 확인).

---

## File Structure

| 파일 | 책임 |
|------|------|
| `supabase/migrations/022_price_table_reseed.sql` (신규) | 기존 `price_items` 전량 삭제(`deleted_at` 포함) 후 PDF 단가표 재시드. fee_rate는 카테고리 규칙대로. |
| `src/lib/invoice/calculator.ts` (수정) | `feeRateForCategory()` 신규 + `calcFee`/`calcWriterNet`를 **희망청구가 기준**으로 정비(하드코딩 0.2 제거). |
| `src/lib/invoice/calculator.test.ts` (수정) | 카테고리별 수수료율(밴드 20%/비밴드 30%) + billing_price 기준 수수료·실수령 테스트 추가. |
| `src/app/(dashboard)/admin/price-table/page.tsx` (수정) | 표 값 컬럼 3개(방어선 제거)·수수료 라벨 그룹별·실수령 자동계산. 선택 체크박스·상태 컬럼 제거 + 행별 액션 컬럼(작가마스터 패턴) 휴지통 이동. 추가폼 작가지급액 제거 + 취소 버튼. |
| `src/components/invoice/InvoiceForm.tsx` (점검) | `price-items` 재fetch 회귀 확인(코드 변경 없을 가능성 높음). |
| `src/lib/revenue/aggregator.ts` (점검) | `price_item_id → category` 매핑 회귀 확인(카테고리명 불변이면 변경 없음). |

---

## Task 1: 마이그레이션 — price_items 재시드(PDF 단가표)

**Files:**
- Create: `supabase/migrations/022_price_table_reseed.sql`

**Interfaces:**
- Produces: `price_items` 전 행이 PDF v1 단가표로 교체됨. 각 행 `(category, name, billing_price, writer_base_pay=NULL, fee_rate, is_formula, formula_note, sort_order)`.
- `fee_rate`: `밴드`·`밴드(플레디스)` = `0.20`, 그 외 = `0.30`.
- `is_formula = true`(billing_price=NULL): 희망청구가가 "청구가 공개"·"비용 논의 필요"·"-"인 항목.
- `writer_base_pay`: 신규 모델에서 더 이상 사용하지 않으므로 전 행 `NULL`로 시드(컬럼은 호환을 위해 유지, Task 2에서 계산 비의존).

> **재시드 데이터 매핑 규칙(SQL 작성 시 적용):**
> - 카테고리(구분) 셀 병합으로 추출 텍스트가 어긋나므로, **카테고리·작업내역·희망청구가·is_formula만** 사용하고 추출본의 "작가 실수령액" 컬럼은 **무시**한다(실수령은 앱에서 자동계산).
> - `fee_rate`는 텍스트의 "수수료" 숫자를 그대로 INSERT하지 말고 **카테고리 규칙**으로 결정한다(밴드/밴드(플레디스)=0.20, 그 외=0.30).
> - billing_price가 "청구가 공개" / "비용 논의 필요" / "-"인 행 → `billing_price = NULL`, `is_formula = true`, `formula_note`에 원문 문구 보존.
> - `sort_order`는 카테고리 내부 1부터 PDF 표시 순서대로.

- [x] **Step 1: 카테고리 매핑 검증 — ✅ 해소됨(사용자 제공 스크린샷으로 확정)**

**게이트 통과.** 사용자가 제공한 단가표 스크린샷 2장으로 카테고리 경계·금액이 전부 확정되었고, 권위 있는 시드 원본을 작성했다:
**`docs/superpowers/plans/assets/2026-06-25-pricetable-authoritative.md`** — 이 파일이 시드의 **단일 진실원천**이다. Step 2 작성 시 이 파일을 그대로 옮긴다(추측 금지).

확정 결과:
- 카테고리 6개 = 앨범(30%) / 방송·공연·시상식(30%) / 광고(30%) / 기타(30%) / 밴드(플레디스)(20%) / 밴드(20%). 기존 `CATEGORIES`·`REVENUE_CATEGORIES`와 **모두 일치 → 상수 추가 불필요.**
- 총 **89행**(앨범 22 + 방송·공연·시상식 21 + 광고 5 + 기타 7 + 밴드(플레디스) 16 + 밴드 18).
- 수식형(billing_price=NULL, is_formula=true): 곡비(바이아웃)="청구가 공개"(앨범·광고 각 1), 밴드 영화관 상영/DVD/녹음="-"(밴드·밴드(플레디스) 각 2). `formula_note`에 원문 보존.

> **⚠️ 구현 시 확인 1건(기타 카테고리):** 권위 원본의 기타 7행은 "레슨/채보/플레이백"의 **하단 '제안 청구가'를 billing_price로 채택**한 안이다(예: 레슨 150,000, 콘서트 플레이백 1,000,000). 만약 이들을 "비용 논의 필요"(협의형)로 두길 원하면 해당 6행을 billing_price=NULL·is_formula=true로 전환. 권위 원본 파일의 ⚠️ 주석 참조. 기본은 제안 청구가 채택으로 진행.

- [ ] **Step 2: 마이그레이션 파일 작성**

`supabase/migrations/022_price_table_reseed.sql` (참조 패턴: `007_invoice_schema.sql` 시드 블록, `012_price_items_trash.sql`):

```sql
-- ============================================================================
-- 프라이스 테이블 재시드 (022_price_table_reseed.sql)
-- 2026 공식 PDF 단가표(최종 내부용 v1, 260410)와 1:1 일치.
-- 기존 price_items 전량 삭제 후 재시드. 수수료율은 카테고리 규칙으로 고정:
--   밴드 / 밴드(플레디스) = 0.20(20%),  그 외 = 0.30(30%).
-- 작가 실수령액·수수료는 앱에서 희망청구가 기준으로 자동계산하므로 INSERT 하지 않는다.
-- FK invoice_items.price_item_id 는 ON DELETE SET NULL(012) → 과거 청구서 스냅샷 보존.
-- ============================================================================

-- 기존 데이터 전량 삭제 (휴지통 항목 deleted_at 포함). 참조 청구서는 FK SET NULL.
DELETE FROM public.price_items;

INSERT INTO public.price_items
  (category, name, billing_price, writer_base_pay, fee_rate, is_formula, formula_note, sort_order)
VALUES
  -- 앨범 (수수료 30%)
  ('앨범', '메인 보컬 튠',                          250000, NULL, 0.30, false, NULL, 1),
  ('앨범', '덥코 튠',                               250000, NULL, 0.30, false, NULL, 2),
  ('앨범', '메인 보컬+코러스(더빙포함) 튠',          400000, NULL, 0.30, false, NULL, 3),
  ('앨범', '곡비 (바이아웃)',                        NULL,   NULL, 0.30, true,  '청구가 공개', 4),
  -- ... (Step 1에서 PDF 대조로 확정한 전 행을 동일 형식으로 이어서 INSERT)
  -- 밴드(플레디스) (수수료 20%)
  ('밴드(플레디스)', '콘서트 밴드 마스터 [2만석 이상]', 3500000, NULL, 0.20, false, NULL, 1),
  -- ... 밴드(플레디스) 나머지 행 ...
  -- 밴드 (수수료 20%)
  ('밴드', '콘서트 밴드 마스터 [2만석 이상]',          2800000, NULL, 0.20, false, NULL, 1);
  -- ... 밴드 나머지 행 + 수식형(영화관 상영/DVD 등) is_formula=true, billing_price=NULL ...
```

> **작성 지침(플레이스홀더 금지):** 위 블록의 `-- ...` 자리는 Step 1에서 확정한 **모든 행**을 빠짐없이 채운 완전한 INSERT 문이어야 한다. 카테고리별 `fee_rate`는 위 규칙대로(밴드 계열 0.20, 그 외 0.30) 일괄 적용한다. "비용 논의 필요"·"-"·"청구가 공개" 행은 `billing_price NULL` + `is_formula true` + `formula_note` 원문.

- [ ] **Step 3: 과거 청구서 FK 영향 분석(데이터 안전 확인)**

재시드는 `DELETE FROM price_items`로 기존 행 id가 사라진다. `invoice_items.price_item_id` FK는 `ON DELETE SET NULL`(012)이므로 과거 청구서 행의 `price_item_id`는 NULL로 풀린다. 청구서 금액·작업내역은 `invoice_items`에 **스냅샷**(`supply_amount`, `writer_pay`, `description`)되어 있어 표시·합계는 보존된다.

영향: aggregator(`src/lib/revenue/aggregator.ts` 68-70)는 `price_item_id`가 NULL이면 카테고리를 `'커스텀'`으로 분류한다 → **과거 paid 청구서의 카테고리별 매출 구성이 '커스텀'으로 이동**할 수 있다(금액 총합은 불변).

- [ ] **Step 4: 영향 수용 여부 결정(사용자 확인 포인트)**

매출 집계의 과거 분류가 '커스텀'으로 바뀌는 것이 허용 가능한지 사용자에게 확인한다. (현재 운영 데이터에 paid 청구서가 없거나 테스트 데이터뿐이면 무시 가능.) 미허용 시 대안: 재시드를 `DELETE` 대신 `is_active=false`로 보존하는 방식 검토 — 단, 본 계획의 "전량 삭제" 결정과 상충하므로 **사용자 결정 우선**.

- [ ] **Step 5: 마이그레이션 적용**

Run: `npx supabase db push`
Expected: `Applying migration 022_price_table_reseed.sql...` 후 성공(No errors). 021까지 기적용분은 건너뜀.

- [ ] **Step 6: 적용 확인**

Run: `npx supabase db push --dry-run`
Expected: `Remote database is up to date.`
추가 확인: 단가표 페이지(`/admin/price-table`) 진입 시 PDF와 동일한 카테고리·행 수가 보이는지 육안 확인.

---

## Task 2: 수수료/실수령 계산을 카테고리·희망청구가 기준으로 정비 (TDD)

**Files:**
- Modify: `src/lib/invoice/calculator.ts`
- Modify: `src/lib/invoice/calculator.test.ts`

**Interfaces:**
- Produces:
  - `feeRateForCategory(category: string): number` — `밴드`/`밴드(플레디스)` → `0.2`, 그 외 → `0.3`.
  - `calcFee(billingPrice: number, feeRate: number): number` — 수수료 = `trunc(billingPrice × feeRate)`.
  - `calcWriterNet(billingPrice: number, feeRate: number): number` — 실수령 = `billingPrice − calcFee(...)`.
- Consumes: 카테고리 문자열, 희망청구가(billing_price).

> **의미 변경 주의:** 기존 `calcFee/calcWriterNet`는 `writerPay`(작가지급액) 기준 + 기본값 `0.2` 하드코딩이었다. 신규 모델은 **희망청구가 기준 + feeRate 명시(기본값 제거)**. 기존 인보이스 계산(`calcItemBreakdown` 등 70%/공급가액 로직)은 **건드리지 않는다** — `calcFee/calcWriterNet`는 현재 단가표 페이지에서만 소비되므로(아래 Task 5에서 소비처 전수 확인) 의미 변경 안전.

- [ ] **Step 1: 실패하는 테스트 작성 (RED)**

`src/lib/invoice/calculator.test.ts`에 추가:

```ts
import {
  // ...기존 import...
  feeRateForCategory,
} from './calculator';

describe('프라이스 테이블 수수료/실수령 (카테고리·희망청구가 기준)', () => {
  it('feeRateForCategory는 밴드 계열만 0.2, 그 외 0.3', () => {
    expect(feeRateForCategory('밴드')).toBe(0.2);
    expect(feeRateForCategory('밴드(플레디스)')).toBe(0.2);
    expect(feeRateForCategory('앨범')).toBe(0.3);
    expect(feeRateForCategory('방송·공연·시상식')).toBe(0.3);
    expect(feeRateForCategory('광고')).toBe(0.3);
    expect(feeRateForCategory('기타')).toBe(0.3);
  });

  it('비밴드 30%: 250,000 → 수수료 75,000 / 실수령 175,000', () => {
    const rate = feeRateForCategory('앨범');
    expect(calcFee(250_000, rate)).toBe(75_000);
    expect(calcWriterNet(250_000, rate)).toBe(175_000);
  });

  it('밴드 20%: 3,500,000 → 수수료 700,000 / 실수령 2,800,000', () => {
    const rate = feeRateForCategory('밴드');
    expect(calcFee(3_500_000, rate)).toBe(700_000);
    expect(calcWriterNet(3_500_000, rate)).toBe(2_800_000);
  });

  it('절사: trunc로 0 방향 절사 (333,333 × 0.3 = 99,999.9 → 99,999)', () => {
    expect(calcFee(333_333, 0.3)).toBe(99_999);
    expect(calcWriterNet(333_333, 0.3)).toBe(233_334);
  });
});
```

Run: `npm test -- calculator`
Expected: `feeRateForCategory` 미정의로 컴파일/테스트 실패(RED).

- [ ] **Step 2: 구현 (GREEN)**

`src/lib/invoice/calculator.ts` 수정.

Before (30-39행):
```ts
// 작가 실수령액 (프라이스 테이블 참고용) = 지급액 − 지급액×수수료율
export function calcWriterNet(writerPay: number, feeRate: number = 0.2): number {
  const fee = Math.trunc(writerPay * feeRate);
  return writerPay - fee;
}

// 관리 수수료 = 작가지급액 × 수수료율
export function calcFee(writerPay: number, feeRate: number = 0.2): number {
  return Math.trunc(writerPay * feeRate);
}
```

After:
```ts
// 밴드 계열 카테고리 — 수수료율 20% (그 외 30%). PDF v1 기준.
const BAND_CATEGORIES = new Set(['밴드', '밴드(플레디스)']);

// 카테고리 → 수수료율. 밴드/밴드(플레디스)=0.2, 그 외=0.3.
export function feeRateForCategory(category: string): number {
  return BAND_CATEGORIES.has(category) ? 0.2 : 0.3;
}

// 관리/밴드 수수료 = 희망청구가 × 수수료율 (0 방향 절사)
export function calcFee(billingPrice: number, feeRate: number): number {
  return Math.trunc(billingPrice * feeRate);
}

// 작가 실수령액 = 희망청구가 − 수수료
export function calcWriterNet(billingPrice: number, feeRate: number): number {
  return billingPrice - calcFee(billingPrice, feeRate);
}
```

Run: `npm test -- calculator`
Expected: 신규 테스트 + 기존 테스트 전부 통과(GREEN).

> **회귀 주의:** 기존 calculator.test.ts에 `calcFee(writerPay)`/`calcWriterNet(writerPay)`를 **기본값 0.2로 인자 1개**만 넘기는 케이스가 있으면, 기본값 제거로 컴파일 에러가 난다. 해당 기존 테스트는 새 의미(희망청구가·feeRate 명시)로 수정하거나 삭제한다(중복 의미면 삭제). 수정 시 의도가 바뀐 단언은 새 값으로 갱신.

- [ ] **Step 3: 타입체크**

Run: `npm run type-check`
Expected: 0 error. (calculator.ts를 import하는 파일에서 시그니처 변경에 따른 에러가 나면 Task 3/5에서 호출부를 함께 고친다.)

---

## Task 3: 단가표 표 UI 재구성 (값 컬럼 3개 + 행 액션 컬럼)

**Files:**
- Modify: `src/app/(dashboard)/admin/price-table/page.tsx`

**Interfaces:**
- Consumes: `feeRateForCategory`, `calcFee`, `calcWriterNet`(Task 2), `PriceItem` 타입.
- Produces: 값 컬럼 = [희망청구가 / 수수료(그룹별 라벨) / 작가 실수령액]. 행별 "액션" 컬럼(삭제 확인 → 휴지통 이동). 선택 체크박스·상태 토글·선택 액션바 제거. 휴지통 모드의 복구/영구삭제 행 액션은 유지.

- [ ] **Step 1: import·상태 정리 (선택/체크박스 제거)**

Before (6-15행 import 일부 + 84-93행 상태):
```ts
import { calcFee, calcWriterNet } from '@/lib/invoice/calculator';
// ...
  // 휴지통 보기 / 선택 / 삭제 선택지
  const [viewTrash, setViewTrash] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleteChoice, setDeleteChoice] = useState(false);
  // 신규 추가 폼
  const [adding, setAdding] = useState(false);
  const [newCategory, setNewCategory] = useState(CATEGORIES[0]);
  const [newName, setNewName] = useState('');
  const [newBilling, setNewBilling] = useState('');
  const [newWriterPay, setNewWriterPay] = useState('');
```

After:
```ts
import { feeRateForCategory, calcFee, calcWriterNet } from '@/lib/invoice/calculator';
// ...
  // 휴지통 보기 / 행 삭제 확인(작가 마스터 패턴)
  const [viewTrash, setViewTrash] = useState(false);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  // 신규 추가 폼 (작가지급액 입력 제거)
  const [adding, setAdding] = useState(false);
  const [newCategory, setNewCategory] = useState(CATEGORIES[0]);
  const [newName, setNewName] = useState('');
  const [newBilling, setNewBilling] = useState('');
```

> `selected`/`deleteChoice`/`newWriterPay` 및 관련 헬퍼(`toggleOne`, `toggleMany`, `clearSelection`, 152-169행) 전부 제거. `runBulk`(172-178)는 일괄→단건으로 단순화하거나, 단건 호출용 헬퍼로 대체(아래 Step 4).

- [ ] **Step 2: 정렬 키를 희망청구가 기준으로 교체**

Before (204-211행):
```ts
  const { sortKey, dir, toggle, sortRows } = useTableSort<PriceItem>({
    name: (it) => it.name,
    billing_price: (it) => it.billing_price,
    writer_base_pay: (it) => it.writer_base_pay,
    fee: (it) => (it.writer_base_pay != null ? calcFee(it.writer_base_pay, it.fee_rate) : null),
    net: (it) => (it.writer_base_pay != null ? calcWriterNet(it.writer_base_pay, it.fee_rate) : null),
  }, 'pf_sort_price_table');
```

After:
```ts
  const { sortKey, dir, toggle, sortRows } = useTableSort<PriceItem>({
    name: (it) => it.name,
    billing_price: (it) => it.billing_price,
    fee: (it) =>
      it.billing_price != null ? calcFee(it.billing_price, feeRateForCategory(it.category)) : null,
    net: (it) =>
      it.billing_price != null ? calcWriterNet(it.billing_price, feeRateForCategory(it.category)) : null,
  }, 'pf_sort_price_table');
```

- [ ] **Step 3: 표 헤더 — 방어선/선택/상태 컬럼 제거, 수수료 라벨 그룹별, 액션 컬럼 추가**

Before (422-443행 thead):
```tsx
                <thead className="bg-primary/10 border-b border-border">
                  <tr className="group">
                    {isAdmin && (
                      <th className="px-3 py-2 w-10 text-center">
                        <input
                          type="checkbox"
                          checked={allSelected}
                          onChange={(e) => toggleMany(ids, e.target.checked)}
                          className={`accent-[var(--primary)] cursor-pointer transition-opacity ${
                            someSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                          }`}
                          aria-label={`${category} 전체 선택`}
                        />
                      </th>
                    )}
                    <SortableHeader label="작업내역" sortKey="name" activeKey={sortKey} dir={dir} onSort={toggle} className="px-3 py-2 w-[320px]" />
                    <SortableHeader label="희망청구가" sortKey="billing_price" activeKey={sortKey} dir={dir} onSort={toggle} align="center" className="px-3 py-2 w-32" />
                    <SortableHeader label="작가지급액 (방어선)" sortKey="writer_base_pay" activeKey={sortKey} dir={dir} onSort={toggle} align="center" className="px-3 py-2 w-36" />
                    <SortableHeader label="관리 수수료 (20%)" sortKey="fee" activeKey={sortKey} dir={dir} onSort={toggle} align="center" className="px-3 py-2 w-36" />
                    <SortableHeader label="작가 실수령액" sortKey="net" activeKey={sortKey} dir={dir} onSort={toggle} align="center" className="px-3 py-2 w-32" />
                    {isAdmin && <th className="px-3 py-2 text-center font-bold text-foreground w-28">{viewTrash ? '액션' : '상태'}</th>}
                  </tr>
                </thead>
```

After:
```tsx
                <thead className="bg-primary/10 border-b border-border">
                  <tr className="group">
                    <SortableHeader label="작업내역" sortKey="name" activeKey={sortKey} dir={dir} onSort={toggle} className="px-3 py-2 w-[360px]" />
                    <SortableHeader label="희망청구가" sortKey="billing_price" activeKey={sortKey} dir={dir} onSort={toggle} align="center" className="px-3 py-2 w-36" />
                    <SortableHeader label={feeLabel} sortKey="fee" activeKey={sortKey} dir={dir} onSort={toggle} align="center" className="px-3 py-2 w-40" />
                    <SortableHeader label="작가 실수령액" sortKey="net" activeKey={sortKey} dir={dir} onSort={toggle} align="center" className="px-3 py-2 w-36" />
                    {isAdmin && <th className="px-3 py-2 text-center font-bold text-foreground w-28">액션</th>}
                  </tr>
                </thead>
```

> `feeLabel`은 그룹(category) 기준으로 map 콜백 안에서 계산한다(Step 5). `ids`/`allSelected`/`someSelected` 계산(412-414행)은 더 이상 필요 없으면 제거.

- [ ] **Step 4: 행 본문 — 방어선/선택셀 제거, 수수료·실수령 자동계산, 액션 컬럼(작가마스터 패턴)**

Before (446-529행 `<tr>` 본문):
```tsx
                  {categoryItems.map((it) => (
                    <tr key={it.id} id={`row-${it.id}`} className={`group hover:bg-primary/5 ${!it.is_active && !viewTrash ? 'opacity-40' : ''} ${selected.has(it.id) ? 'bg-primary/5' : ''}`}>
                      {isAdmin && (
                        <td className="px-3 py-2 text-center">
                          <input
                            type="checkbox"
                            checked={selected.has(it.id)}
                            onChange={() => toggleOne(it.id)}
                            className={`accent-[var(--primary)] cursor-pointer transition-opacity ${
                              selected.has(it.id) ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                            }`}
                            aria-label={`${it.name} 선택`}
                          />
                        </td>
                      )}
                      <td className="px-3 py-2 text-foreground w-[320px] truncate" title={it.name}>
                        {it.name}
                        {it.is_formula && (
                          <span className="ml-2 text-amber-400 cursor-help" title={it.formula_note ?? '수식형 항목'}>
                            ⓘ 수식
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-center text-foreground whitespace-nowrap">
                        {it.is_formula ? (
                          <span className="text-muted-foreground text-[11px]">{it.formula_note ?? '협의'}</span>
                        ) : (
                          <AmountCell
                            value={it.billing_price}
                            editable={isAdmin && !viewTrash}
                            onSave={(v) => patchItem(it.id, { billing_price: v })}
                          />
                        )}
                      </td>
                      <td className="px-3 py-2 text-center text-foreground whitespace-nowrap">
                        {it.is_formula ? (
                          <span className="text-muted-foreground">-</span>
                        ) : (
                          <AmountCell
                            value={it.writer_base_pay}
                            editable={isAdmin && !viewTrash}
                            onSave={(v) => patchItem(it.id, { writer_base_pay: v })}
                          />
                        )}
                      </td>
                      <td className="px-3 py-2 text-center text-muted-foreground tabular-nums whitespace-nowrap">
                        {it.writer_base_pay != null ? formatWon(calcFee(it.writer_base_pay, it.fee_rate)) : '-'}
                      </td>
                      <td className="px-3 py-2 text-center text-green-500 tabular-nums whitespace-nowrap">
                        {it.writer_base_pay != null ? formatWon(calcWriterNet(it.writer_base_pay, it.fee_rate)) : '-'}
                      </td>
                      {isAdmin && (
                        <td className="px-3 py-2 text-center">
                          {viewTrash ? (
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => restore([it.id])}
                                className="px-2 py-1 rounded text-[11px] font-medium bg-primary/15 text-primary hover:bg-primary/25 transition"
                              >
                                복구
                              </button>
                              <button
                                onClick={() => permanentDelete([it.id])}
                                className="px-2 py-1 rounded text-[11px] font-medium bg-red-500/20 text-red-400 hover:bg-red-500/30 transition"
                              >
                                영구삭제
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => patchItem(it.id, { is_active: !it.is_active })}
                              className={`px-2 py-1 rounded text-[11px] font-medium transition whitespace-nowrap ${
                                it.is_active
                                  ? 'bg-green-500/20 text-green-400 hover:bg-red-500/20 hover:text-red-400'
                                  : 'bg-gray-500/20 text-gray-400 hover:bg-green-500/20 hover:text-green-400'
                              }`}
                              title={it.is_active ? '클릭하여 비활성화' : '클릭하여 활성화'}
                            >
                              {it.is_active ? '사용 중' : '비활성'}
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
```

After:
```tsx
                  {categoryItems.map((it) => {
                    // 수수료/실수령은 희망청구가 × 카테고리 수수료율로 자동계산 (수식형은 '-')
                    const feeRate = feeRateForCategory(it.category);
                    const fee = it.billing_price != null ? calcFee(it.billing_price, feeRate) : null;
                    const net = it.billing_price != null ? calcWriterNet(it.billing_price, feeRate) : null;
                    return (
                    <tr key={it.id} id={`row-${it.id}`} className={`group hover:bg-primary/5 ${!it.is_active && !viewTrash ? 'opacity-40' : ''}`}>
                      <td className="px-3 py-2 text-foreground w-[360px] truncate" title={it.name}>
                        {it.name}
                        {it.is_formula && (
                          <span className="ml-2 text-amber-400 cursor-help" title={it.formula_note ?? '수식형 항목'}>
                            ⓘ 수식
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-center text-foreground whitespace-nowrap">
                        {it.is_formula ? (
                          <span className="text-muted-foreground text-[11px]">{it.formula_note ?? '협의'}</span>
                        ) : (
                          <AmountCell
                            value={it.billing_price}
                            editable={isAdmin && !viewTrash}
                            onSave={(v) => patchItem(it.id, { billing_price: v })}
                          />
                        )}
                      </td>
                      <td className="px-3 py-2 text-center text-muted-foreground tabular-nums whitespace-nowrap">
                        {fee != null ? formatWon(fee) : '-'}
                      </td>
                      <td className="px-3 py-2 text-center text-green-500 tabular-nums whitespace-nowrap">
                        {net != null ? formatWon(net) : '-'}
                      </td>
                      {isAdmin && (
                        <td className="px-3 py-2 text-center">
                          {viewTrash ? (
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => restore(it.id)}
                                className="px-2 py-1 rounded text-[11px] font-medium bg-primary/15 text-primary hover:bg-primary/25 transition cursor-pointer"
                              >
                                복구
                              </button>
                              <button
                                onClick={() => permanentDelete(it.id)}
                                className="px-2 py-1 rounded text-[11px] font-medium bg-red-500/20 text-red-400 hover:bg-red-500/30 transition cursor-pointer"
                              >
                                영구삭제
                              </button>
                            </div>
                          ) : confirmingId === it.id ? (
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => moveToTrash(it.id)}
                                className="px-2 py-1 rounded text-[11px] font-medium bg-red-500/20 text-red-400 hover:bg-red-500/30 transition cursor-pointer"
                              >
                                삭제
                              </button>
                              <button
                                onClick={() => setConfirmingId(null)}
                                className="px-2 py-1 rounded text-[11px] font-medium bg-gray-500/20 text-gray-400 hover:bg-gray-500/30 transition cursor-pointer"
                              >
                                취소
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setConfirmingId(it.id)}
                              className="p-1.5 text-muted-foreground hover:text-red-400 transition rounded hover:bg-red-500/10 cursor-pointer"
                              title="삭제(휴지통 이동)"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                    );
                  })}
```

> `feeLabel`은 그룹 map 콜백 시작부에서 `const feeLabel = feeRateForCategory(category) === 0.2 ? '밴드 수수료 (20%)' : '관리 수수료 (30%)';`로 1회 계산해 Step 3 헤더에 전달.
> 삭제 아이콘은 기존 import된 `Trash2`(lucide) 재사용. `moveToTrash`는 단건 id 시그니처로 단순화(아래).

- [ ] **Step 5: 단건 휴지통/복구/영구삭제 헬퍼로 단순화 + 선택 액션바 제거**

Before (171-202행 일괄 헬퍼):
```ts
  const runBulk = async (ids: string[], fn: (id: string) => Promise<Response>, doneMsg: string) => {
    const results = await Promise.all(ids.map(fn));
    const ok = results.filter((r) => r.ok).length;
    clearSelection();
    await fetchItems();
    showToast(`${doneMsg} (${ok}/${ids.length})`);
  };

  const moveToTrash = (ids: string[]) =>
    runBulk(ids, (id) => fetch(`/api/price-items/${id}`, { method: 'DELETE' }), '휴지통으로 이동');

  const permanentDelete = (ids: string[]) =>
    runBulk(ids, (id) => fetch(`/api/price-items/${id}?permanent=1`, { method: 'DELETE' }), '영구 삭제');

  const restore = (ids: string[]) =>
    runBulk(
      ids,
      (id) => fetch(`/api/price-items/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deleted_at: null }),
      }),
      '복구',
    );
```

After:
```ts
  // 단건 작업: 완료 후 목록 새로고침 + 토스트
  const runOne = async (req: Promise<Response>, doneMsg: string) => {
    const res = await req;
    setConfirmingId(null);
    await fetchItems();
    showToast(res.ok ? doneMsg : '작업 실패');
  };

  const moveToTrash = (id: string) =>
    runOne(fetch(`/api/price-items/${id}`, { method: 'DELETE' }), '휴지통으로 이동');

  const permanentDelete = (id: string) =>
    runOne(fetch(`/api/price-items/${id}?permanent=1`, { method: 'DELETE' }), '영구 삭제');

  const restore = (id: string) =>
    runOne(
      fetch(`/api/price-items/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deleted_at: null }),
      }),
      '복구',
    );
```

> 선택 액션바 블록(291-345행) 전체 삭제. `emptyTrash`(197-202행)와 휴지통 비우기 버튼은 유지(단, `clearSelection()` 호출 줄 제거). 휴지통 토글 버튼의 `clearSelection()` 호출(269행)도 `setConfirmingId(null)`로 대체.

- [ ] **Step 6: 타입체크·린트**

Run: `npm run type-check` 그리고 `npx eslint src/app/(dashboard)/admin/price-table/page.tsx`
Expected: 0 error. (제거한 state/헬퍼의 미사용 import·변수 경고 없음.)

---

## Task 4: 추가폼 — 작가지급액 입력 제거 + 취소 버튼

**Files:**
- Modify: `src/app/(dashboard)/admin/price-table/page.tsx`

**Interfaces:**
- Consumes: `newCategory`, `newName`, `newBilling`(Task 3에서 `newWriterPay` 이미 제거).
- Produces: 추가폼 필드 = 카테고리 / 작업내역 / 희망청구가. "추가"+"취소" 버튼. 저장 시 `writer_base_pay` 미전송(실수령은 fee_rate 자동계산).

- [ ] **Step 1: handleAdd에서 writer_base_pay 제거**

Before (130-150행):
```ts
  const handleAdd = async () => {
    if (!newName.trim()) { showToast('작업내역명을 입력하세요'); return; }
    const res = await fetch('/api/price-items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        category: newCategory,
        name: newName.trim(),
        billing_price: newBilling === '' ? null : Number(newBilling),
        writer_base_pay: newWriterPay === '' ? null : Number(newWriterPay),
      }),
    });
    if (res.ok) {
      setAdding(false);
      setNewName(''); setNewBilling(''); setNewWriterPay('');
      fetchItems();
      showToast('항목 추가 완료');
    } else {
      showToast((await res.json()).error || '추가 실패');
    }
  };
```

After:
```ts
  // 추가폼 입력 리셋 (추가 완료/취소 공용)
  const resetAddForm = () => {
    setAdding(false);
    setNewCategory(CATEGORIES[0]);
    setNewName('');
    setNewBilling('');
  };

  const handleAdd = async () => {
    if (!newName.trim()) { showToast('작업내역명을 입력하세요'); return; }
    const res = await fetch('/api/price-items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        category: newCategory,
        name: newName.trim(),
        billing_price: newBilling === '' ? null : Number(newBilling),
        // writer_base_pay 미전송 — 실수령은 fee_rate(카테고리) 기준 자동계산
      }),
    });
    if (res.ok) {
      resetAddForm();
      fetchItems();
      showToast('항목 추가 완료');
    } else {
      showToast((await res.json()).error || '추가 실패');
    }
  };
```

- [ ] **Step 2: 추가폼 마크업 — 작가지급액 입력 제거 + 취소 버튼 추가**

Before (369-391행, 희망청구가 div 이후 ~ 추가 버튼까지):
```tsx
          <div>
            <label className="block text-xs text-muted-foreground mb-1">희망청구가</label>
            <NumericInput
              value={newBilling === '' ? 0 : Number(newBilling)}
              onChange={(v) => setNewBilling(v === 0 ? '' : String(v))}
              className="w-32 px-3 py-2 text-sm bg-background border border-border rounded-lg outline-none focus:border-primary text-foreground tabular-nums"
            />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">작가지급액</label>
            <NumericInput
              value={newWriterPay === '' ? 0 : Number(newWriterPay)}
              onChange={(v) => setNewWriterPay(v === 0 ? '' : String(v))}
              className="w-32 px-3 py-2 text-sm bg-background border border-border rounded-lg outline-none focus:border-primary text-foreground tabular-nums"
            />
          </div>
          <button
            onClick={handleAdd}
            className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition"
          >
            추가
          </button>
```

After:
```tsx
          <div>
            <label className="block text-xs text-muted-foreground mb-1">희망청구가</label>
            <NumericInput
              value={newBilling === '' ? 0 : Number(newBilling)}
              onChange={(v) => setNewBilling(v === 0 ? '' : String(v))}
              className="w-32 px-3 py-2 text-sm bg-background border border-border rounded-lg outline-none focus:border-primary text-foreground tabular-nums"
            />
          </div>
          <button
            onClick={handleAdd}
            className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition cursor-pointer"
          >
            추가
          </button>
          <button
            onClick={resetAddForm}
            className="px-4 py-2 text-sm border border-border text-foreground rounded-lg hover:bg-muted transition cursor-pointer"
          >
            취소
          </button>
```

> "+ 항목 추가" 토글 버튼(259-266행)의 `onClick={() => setAdding((v) => !v)}`은 그대로 두되, 닫을 때 입력이 남지 않도록 `resetAddForm`을 쓰도록 통일해도 된다(선택). 헤더 안내문(243행)의 "수수료는 작가지급액의 20%" 문구는 "수수료는 희망청구가 기준 · 밴드 20% / 그 외 30%"로 갱신.

- [ ] **Step 3: 타입체크·린트**

Run: `npm run type-check` && `npx eslint src/app/(dashboard)/admin/price-table/page.tsx`
Expected: 0 error, `newWriterPay` 미사용 잔재 없음.

---

## Task 5: 소비처 회귀 점검 + 전체 검증

**Files:**
- Inspect: `src/components/invoice/InvoiceForm.tsx`, `src/components/invoice/PriceItemSelect.tsx`, `src/lib/revenue/aggregator.ts`, `src/app/(dashboard)/page.tsx`
- (변경 가능성 낮음 — 영향 시에만 수정)

**Interfaces:**
- 검증 대상: `calcFee`/`calcWriterNet` 시그니처 변경(Task 2)의 **전 소비처**가 단가표 페이지로 한정되는지, 청구서/홈피드/aggregator는 `price_items` 재fetch로 자동 반영되는지.

- [ ] **Step 1: 계산 헬퍼 소비처 전수 확인**

Run: `git grep -n "calcFee\|calcWriterNet"` (또는 Grep 도구)
Expected: 호출처가 `src/app/(dashboard)/admin/price-table/page.tsx`와 `calculator.test.ts`로 한정. **그 외 파일에서 호출되면** 해당 파일도 새 시그니처(billing_price, feeRate)로 수정해야 한다. (조사 시점 기준 InvoiceForm은 `billing_price`/`writer_pay_rate(70%)` 기반이라 이 헬퍼를 쓰지 않음 — 확인할 것.)

- [ ] **Step 2: 청구서 폼 — 항목 선택 시 단가 반영 확인**

`src/components/invoice/InvoiceForm.tsx` 73-79행(`/api/price-items` fetch)·145행(`supply_amount: p.billing_price ?? 0`)·163행(협의가 플래그)·PriceItemSelect 연동을 점검. 재시드 후에도 `billing_price` 기반이라 코드 변경 없이 새 단가가 반영되어야 한다. `writer_base_pay` 제거가 InvoiceForm에 영향 없는지 확인(InvoiceForm은 `writer_pay`/`writer_pay_rate`만 사용 — `price_items.writer_base_pay`는 미참조).

- [ ] **Step 3: aggregator 카테고리 매핑 확인**

`src/lib/revenue/aggregator.ts` 11-19행 `REVENUE_CATEGORIES`와 재시드 카테고리명(앨범/방송·공연·시상식/광고/기타/밴드/밴드(플레디스))이 **정확히 일치**하는지 확인(오타·공백 불일치 시 '커스텀'으로 빠진다). Task 1 Step 3의 FK SET NULL 영향(과거 청구서 '커스텀' 이동)을 재확인.

Run: `npm test -- aggregator`
Expected: 기존 aggregator 테스트 전부 통과(카테고리 상수 불변).

- [ ] **Step 4: 홈피드 fetch 확인**

`src/app/(dashboard)/page.tsx` 45행 `/api/price-items?all=1` 사용처가 재시드 데이터로 정상 렌더되는지 확인(코드 변경 불필요 예상).

- [ ] **Step 5: 전체 검증 게이트**

Run (순서대로):
- `npm test` — 전체 단위테스트 0 fail.
- `npm run type-check` — 0 error.
- `npx eslint .` — 0 error.
- `npm run build` — 0 error.

Expected: 모두 통과.

- [ ] **Step 6: Playwright E2E(인증 세션) 회귀**

`/admin/price-table` 진입 후 확인:
- 값 컬럼이 [희망청구가 / 수수료 / 작가 실수령액] 3개이고 '작가지급액(방어선)'·선택 체크박스·상태 토글이 없다.
- 밴드 그룹 헤더 수수료 라벨="밴드 수수료 (20%)", 그 외="관리 수수료 (30%)".
- 표본 검증: 앨범 250,000 → 수수료 75,000 / 실수령 175,000. 밴드 3,500,000 → 700,000 / 2,800,000.
- 행 액션: 삭제 아이콘 클릭 → "삭제/취소" 확인 → "삭제" 시 휴지통 이동. 휴지통 모드에서 복구/영구삭제 동작.
- 추가폼: 필드 3개(카테고리/작업내역/희망청구가), "추가"+"취소", 취소 시 폼 닫힘·입력 리셋.

---

## Self-Review

- [ ] **PDF 일치:** 재시드 전 행이 원본 PDF와 1:1 대조 확정되었고, 모호 행은 사용자 확인을 거쳤다(임의 추정 없음).
- [ ] **DRY:** fee_rate 결정·수수료·실수령 계산이 `calculator.ts` 한 곳에만 있고, 페이지/컴포넌트에 `× 0.2`/`× 0.3`/`× (1-fee)` 인라인 복제가 없다.
- [ ] **의미 변경 안전:** `calcFee`/`calcWriterNet`가 희망청구가 기준으로 바뀌었고, 소비처가 단가표 페이지로 한정됨을 git grep으로 확인했다. 인보이스 70% 계산(`calcItemBreakdown`)은 손대지 않았다.
- [ ] **컬럼 정리:** 값 컬럼 3개(방어선 제거), 수수료 라벨 그룹별, 실수령 자동계산, 선택 체크박스·상태 토글·선택 액션바 제거.
- [ ] **행 액션:** 작가 마스터와 동일 패턴(삭제 아이콘 → 삭제/취소 확인 → 휴지통 이동). 기존 휴지통(복구/영구삭제) 유지.
- [ ] **추가폼:** 작가지급액 입력 제거, 취소 버튼 추가, `writer_base_pay` 미전송.
- [ ] **데이터 안전:** FK `ON DELETE SET NULL` 덕분에 과거 청구서 스냅샷 보존. aggregator의 '커스텀' 이동 영향을 사용자와 합의했다.
- [ ] **검증:** `npm test`·type-check·eslint·build 전부 0 error, Playwright 회귀 통과.
- [ ] **커밋 보류:** 사용자 명시 지시 전까지 커밋/푸시/머지하지 않았다.

### 핵심 결정
- 수수료/실수령 계산 기준을 `writer_base_pay` → **희망청구가(billing_price)**로 변경(PDF 정의와 일치). `writer_base_pay` 컬럼은 NULL 시드로 남기되 표·계산에서 미사용.
- 수수료율은 행별 `fee_rate` 컬럼값 대신 **카테고리 규칙(`feeRateForCategory`)**을 단일 출처로 사용 → 시드값과 표시가 항상 일치, 누락·오설정 방지. (시드 `fee_rate`도 동일 규칙으로 채워 정합 유지.)

### 미해결 리스크
- **카테고리 매핑 확정(최우선):** 추출 텍스트의 셀 병합으로 14~168행 카테고리 경계가 불명확. **원본 PDF 시각 대조 필수**, 모호 행 잔존 시 사용자에게 원본 Excel/CSV 요청 후 진행(Task 1 Step 1 게이트).
- **과거 매출 분류 이동:** 재시드 `DELETE`로 과거 paid 청구서의 `price_item_id`가 NULL → aggregator에서 '커스텀'으로 분류 이동(총액 불변). 운영 데이터 유무에 따라 수용 여부 사용자 확인 필요(Task 1 Step 4).
- **마이그레이션 적용 방식:** 본 저장소는 `npx supabase db push` 패턴(021 계획서와 동일). 사용자가 언급한 "Management API access token 직접 실행"용 스크립트는 저장소에 부재 — `db push`로 진행하되, 사용자가 토큰 방식을 고수하면 적용 명령만 교체(SQL 내용 동일).
