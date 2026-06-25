# 거래처 청구서 UI 라벨 정리 + 작업자 컬럼 추가 구현 계획

작성일: 2026-06-25
대상 프로젝트: PRISM FILTER ERP (Next.js 16 App Router · React 19 · TypeScript strict · Tailwind v4 · Supabase)

## 개요

거래처 청구서 관련 4건의 수정을 수행한다.

1. UI 라벨 "귀속금액"/"귀속 금액" → "회사 수수료"로 전부 교체 (UI 표시 8곳)
2. UI 라벨 "작가수수료(%)" → "작가 수수료(%)" (띄어쓰기 추가, 1곳)
3. 거래처 청구서 목록 표에 "작업자" 컬럼 추가 (내부 지급서와 동일 형식)
4. 위 작업자 요약 로직을 공용 유틸로 추출하여 두 페이지가 공유 (DRY)

순수 라벨/표시 변경과 DRY 리팩터링이며, 계산 로직·라우트·식별자는 전혀 건드리지 않는다.

---

## Global Constraints

- TypeScript strict 모드 준수. `any` 타입 사용 금지.
- 들여쓰기 2칸. 주석은 한국어로 작성.
- **중복 코드 절대 금지 (DRY)**: 작업자 요약 로직을 두 곳에 복붙하지 말고 공용 유틸로 추출 후 재사용한다.
- **라벨 텍스트(표시 문자열)만 변경**한다. 계산 로직(`calcItemBreakdown`, `calcInvoiceTotals` 등)·라우트·코드 식별자는 불변.
- **코드 식별자/변수명/함수명/주석/인터페이스 프로퍼티 주석에 있는 "귀속" 단어는 절대 변경 금지** (아래 "비변경 목록" 참조). `attribution*` 식별자는 그대로 둔다.
- 검증: `npm run type-check` · `npx eslint <변경 파일들>` · `npm run build` 가 모두 0 error로 통과해야 한다.
- 커밋/푸시/머지는 **사용자가 명시적으로 지시할 때만** 수행한다. 자동 커밋 금지.

---

## 비변경 목록 (절대 건드리지 말 것)

아래는 UI 표시 라벨이 아니라 **코드 식별자·주석·테스트 설명·인터페이스 프로퍼티 주석**에 등장하는 "귀속" 또는 `attribution`이다. 이번 작업의 변경 대상이 **아니며**, 그대로 유지한다.

- `attribution` / `attributionTotal` / `taxC` 등 모든 변수·프로퍼티·함수 식별자
- `src/types/invoice.ts:147` — `attributionTotal: number;  // 총 귀속금액 (C) = A − B` (인터페이스 주석)
- `src/lib/invoice/calculator.ts:4, 18` — 주석
- `src/components/invoice/InvoicePreview.tsx:4, 141` — 주석
- `src/lib/home/rankings.ts:3, 28` — 주석
- `src/lib/home/rankings.test.ts:46, 47` — 테스트 설명
- `src/lib/revenue/aggregator.ts:4, 22, 119, 149` — 주석
- `src/lib/revenue/aggregator.test.ts:58, 81, 110` — 테스트 설명
- `src/components/home/HeroRevenueCard.tsx:9` — 주석
- `src/components/home/CategoryDonut.tsx:3, 4` — 주석
- `src/app/(dashboard)/revenue/page.tsx:4, 115` — 주석
- `src/app/(dashboard)/page.tsx:82, 91, 163` — 주석
- `src/app/(dashboard)/payouts/page.tsx:46` — 주석 (`// 정렬: 날짜·거래처·거래명·총작가지급액·총귀속금액`)

> 구현 시 단순 일괄 치환(`sed`/전역 Replace All) 금지. 아래 명시된 정확한 라벨 문자열만 개별적으로 교체한다.

---

## Task 1: UI 라벨 교체 ("귀속금액→회사 수수료" 8곳 + "작가 수수료(%)" 1곳)

### Files

- `src/components/invoice/InvoiceForm.tsx`
- `src/components/invoice/InvoicePreview.tsx`
- `src/lib/invoice/excelExport.ts`
- `src/app/(dashboard)/payouts/page.tsx`

### Interfaces

변경 없음. 표시 문자열만 교체한다.

### Steps

- [ ] **Step 1-1: `InvoiceForm.tsx` 테이블 헤더 2곳 교체**

`src/components/invoice/InvoiceForm.tsx:382` — "작가수수료(%)" → "작가 수수료(%)", `:383` — "귀속금액" → "회사 수수료".

Before:
```tsx
                <th className="px-2 py-2.5 text-center font-bold text-foreground w-24">작가수수료(%)</th>
                <th className="px-2 py-2.5 text-center font-bold text-foreground w-32">귀속금액</th>
```

After:
```tsx
                <th className="px-2 py-2.5 text-center font-bold text-foreground w-24">작가 수수료(%)</th>
                <th className="px-2 py-2.5 text-center font-bold text-foreground w-32">회사 수수료</th>
```

- [ ] **Step 1-2: `InvoiceForm.tsx` 합계 라벨 교체**

`src/components/invoice/InvoiceForm.tsx:509` — "총 귀속금액 (C = A − B)" → "총 회사 수수료 (C = A − B)".

Before:
```tsx
            <div className="text-xs text-muted-foreground mb-1">총 귀속금액 (C = A − B)</div>
```

After:
```tsx
            <div className="text-xs text-muted-foreground mb-1">총 회사 수수료 (C = A − B)</div>
```

- [ ] **Step 1-3: `InvoicePreview.tsx` 내부 모드 테이블 헤더 교체**

`src/components/invoice/InvoicePreview.tsx:107` — "귀속 금액" → "회사 수수료".

Before:
```tsx
                <th className="px-3 py-2.5 text-center w-24 font-bold last:rounded-tr-md">귀속 금액</th>
```

After:
```tsx
                <th className="px-3 py-2.5 text-center w-24 font-bold last:rounded-tr-md">회사 수수료</th>
```

- [ ] **Step 1-4: `InvoicePreview.tsx` 합계 라벨 교체**

`src/components/invoice/InvoicePreview.tsx:199` — "총 귀속금액 (C)" → "총 회사 수수료 (C)".

Before:
```tsx
                <span>총 귀속금액 (C)</span>
```

After:
```tsx
                <span>총 회사 수수료 (C)</span>
```

- [ ] **Step 1-5: `excelExport.ts` 엑셀 헤더 교체**

`src/lib/invoice/excelExport.ts:120` — "귀속 금액" → "회사 수수료".

Before:
```ts
      { text: '귀속 금액', align: 'right' },
```

After:
```ts
      { text: '회사 수수료', align: 'right' },
```

- [ ] **Step 1-6: `excelExport.ts` 엑셀 합계행 라벨 교체**

`src/lib/invoice/excelExport.ts:141` — "총 귀속금액 (C)" → "총 회사 수수료 (C)".

Before:
```ts
    totalRow(ws, r + 2, cols, '총 귀속금액 (C)', totals.attributionTotal);
```

After:
```ts
    totalRow(ws, r + 2, cols, '총 회사 수수료 (C)', totals.attributionTotal);
```

> 주의: 두 번째 인자 `totals.attributionTotal` 은 식별자이므로 변경하지 않는다. 첫 라벨 문자열만 교체.

- [ ] **Step 1-7: `payouts/page.tsx` 설명문 교체**

`src/app/(dashboard)/payouts/page.tsx:64` — 설명문 내 "귀속금액" → "회사 수수료".

Before:
```tsx
        <p className="text-muted-foreground text-sm">작가별 지급액과 귀속금액 내역 (내부용)</p>
```

After:
```tsx
        <p className="text-muted-foreground text-sm">작가별 지급액과 회사 수수료 내역 (내부용)</p>
```

- [ ] **Step 1-8: `payouts/page.tsx` 테이블 헤더 라벨 교체**

`src/app/(dashboard)/payouts/page.tsx:99` — SortableHeader label "총 귀속금액 (C)" → "총 회사 수수료 (C)".

Before:
```tsx
                  <SortableHeader label="총 귀속금액 (C)" sortKey="attribution" activeKey={sortKey} dir={dir} onSort={toggle} align="center" className="px-4 py-3 text-xs uppercase" />
```

After:
```tsx
                  <SortableHeader label="총 회사 수수료 (C)" sortKey="attribution" activeKey={sortKey} dir={dir} onSort={toggle} align="center" className="px-4 py-3 text-xs uppercase" />
```

> 주의: `sortKey="attribution"` 은 식별자이므로 변경하지 않는다. `label` 문자열만 교체.
> `:46` 의 주석(`// 정렬: ...총귀속금액`)은 비변경 목록이므로 그대로 둔다.

### 검증 (Task 1)

- [ ] `npx eslint src/components/invoice/InvoiceForm.tsx src/components/invoice/InvoicePreview.tsx src/lib/invoice/excelExport.ts "src/app/(dashboard)/payouts/page.tsx"` → 0 error
- [ ] `npm run type-check` → 0 error
- [ ] Grep 확인: `귀속금액|귀속 금액` 검색 시 잔여 매치가 모두 비변경 목록(주석/식별자 주석)인지 확인. UI 라벨에는 잔여가 없어야 한다.

---

## Task 2: writerSummary 공용 유틸 추출 + 거래처 청구서 목록에 "작업자" 컬럼 추가

### Files

- `src/lib/invoice/writerSummary.ts` (신규)
- `src/app/(dashboard)/payouts/page.tsx` (로컬 함수 제거 → 공용 유틸 사용)
- `src/app/(dashboard)/invoices/page.tsx` (작업자 컬럼 추가 + 공용 유틸 사용)

### Interfaces

신규 공용 유틸. 현재 `payouts/page.tsx` 의 로컬 `writerSummary(inv: Invoice)` 는 내부적으로 `inv.items ?? []` 를 `getInternalItems` 에 넘긴다. 두 호출부 모두 `Invoice` 객체를 갖고 있으므로, 유틸은 작업 데이터인 `InvoiceItem[]` 을 직접 받도록 설계한다(가장 재사용성 높고 의존성 적음).

```ts
// src/lib/invoice/writerSummary.ts
import type { InvoiceItem } from '@/types/invoice';

/**
 * 내부 표시 항목에서 작업자 이름을 중복 제거하여 요약한다.
 * 최대 3명까지 나열하고 그 이상은 "외 N명" 으로 축약한다.
 * @returns 작업자가 없으면 '-'
 */
export function writerSummary(items: InvoiceItem[]): string;
```

호출부는 `writerSummary(inv.items ?? [])` 형태로 사용한다.

### Steps

- [ ] **Step 2-1: 공용 유틸 `src/lib/invoice/writerSummary.ts` 신규 작성**

기존 `payouts/page.tsx:35~44` 의 로컬 로직을 그대로 옮기되, 인자를 `InvoiceItem[]` 로 받도록 변경한다.

신규 파일 전체:
```ts
// 청구서 작업자 요약 — 내부 표시 항목의 작업자 이름을 중복 제거해 축약
import type { InvoiceItem } from '@/types/invoice';
import { getInternalItems } from '@/lib/invoice/calculator';

/**
 * 내부 표시 항목에서 작업자 이름을 중복 제거하여 요약한다.
 * 최대 3명까지 나열하고 그 이상은 "외 N명" 으로 축약한다.
 */
export function writerSummary(items: InvoiceItem[]): string {
  const names = new Set<string>();
  getInternalItems(items).forEach((it) => {
    it.writer_names.split(',').map((n) => n.trim()).filter(Boolean).forEach((n) => names.add(n));
  });
  const arr = Array.from(names);
  if (arr.length === 0) return '-';
  if (arr.length <= 3) return arr.join(', ');
  return `${arr.slice(0, 3).join(', ')} 외 ${arr.length - 3}명`;
}
```

- [ ] **Step 2-2: `payouts/page.tsx` — 로컬 `writerSummary` 제거하고 공용 유틸 import**

import 구문 추가 (`getInternalItems` 는 정렬/필터에서 더는 직접 쓰지 않으면 제거; 현재 payouts 에서는 로컬 writerSummary 에서만 사용하므로 함께 제거 가능). 현재 `payouts/page.tsx:8` 에서 `getInternalItems` 를 import 하고 있고, 이는 로컬 `writerSummary` 에서만 쓰인다.

Before (`src/app/(dashboard)/payouts/page.tsx:8`):
```tsx
import { calcInvoiceTotals, getInternalItems } from '@/lib/invoice/calculator';
import { formatWon } from '@/lib/settlement/calculator';
import { useTableSort } from '@/hooks/useTableSort';
import { SortableHeader } from '@/components/ui/SortableHeader';
```

After:
```tsx
import { calcInvoiceTotals } from '@/lib/invoice/calculator';
import { formatWon } from '@/lib/settlement/calculator';
import { useTableSort } from '@/hooks/useTableSort';
import { SortableHeader } from '@/components/ui/SortableHeader';
import { writerSummary } from '@/lib/invoice/writerSummary';
```

> 주의: `getInternalItems` 가 payouts 파일의 다른 곳에서 쓰이지 않는지 구현 시 Grep 으로 재확인. 쓰이지 않으면 위처럼 import 에서 제거(미사용 import 는 eslint 에러). 만약 다른 용도로 남아 있으면 import 는 유지한다.

로컬 함수 제거 (`src/app/(dashboard)/payouts/page.tsx:34~44`):

Before:
```tsx
  // 작업자 요약 (중복 제거, 최대 3명 + 외 N명)
  const writerSummary = (inv: Invoice): string => {
    const names = new Set<string>();
    getInternalItems(inv.items ?? []).forEach((it) => {
      it.writer_names.split(',').map((n) => n.trim()).filter(Boolean).forEach((n) => names.add(n));
    });
    const arr = Array.from(names);
    if (arr.length === 0) return '-';
    if (arr.length <= 3) return arr.join(', ');
    return `${arr.slice(0, 3).join(', ')} 외 ${arr.length - 3}명`;
  };

  // 정렬: 날짜·거래처·거래명·총작가지급액·총귀속금액
```

After (로컬 함수 블록 삭제, 주석 줄은 유지):
```tsx
  // 정렬: 날짜·거래처·거래명·총작가지급액·총귀속금액
```

작업자 셀 호출부 변경 (`src/app/(dashboard)/payouts/page.tsx:122~124`):

Before:
```tsx
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        {writerSummary(inv)}
                      </td>
```

After:
```tsx
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        {writerSummary(inv.items ?? [])}
                      </td>
```

> `Invoice` 타입 import(`src/app/(dashboard)/payouts/page.tsx:7`)는 `useState<Invoice[]>` 등에서 계속 쓰이므로 유지한다.

- [ ] **Step 2-3: `invoices/page.tsx` — 공용 유틸 import 추가**

Before (`src/app/(dashboard)/invoices/page.tsx:8~11`):
```tsx
import { calcInvoiceTotals } from '@/lib/invoice/calculator';
import { formatWon } from '@/lib/settlement/calculator';
import { useTableSort } from '@/hooks/useTableSort';
import { SortableHeader } from '@/components/ui/SortableHeader';
```

After:
```tsx
import { calcInvoiceTotals } from '@/lib/invoice/calculator';
import { formatWon } from '@/lib/settlement/calculator';
import { useTableSort } from '@/hooks/useTableSort';
import { SortableHeader } from '@/components/ui/SortableHeader';
import { writerSummary } from '@/lib/invoice/writerSummary';
```

- [ ] **Step 2-4: `invoices/page.tsx` — 테이블 헤더에 "작업자" `th` 추가**

거래명 헤더 다음, 총 합계 헤더 앞에 payouts 와 동일 형식의 작업자 헤더를 넣는다(정렬 불필요하므로 일반 `th`).

Before (`src/app/(dashboard)/invoices/page.tsx:184~185`):
```tsx
                  <SortableHeader label="거래명" sortKey="title" activeKey={sortKey} dir={dir} onSort={toggle} className="px-4 py-3 text-xs uppercase" />
                  <SortableHeader label="총 합계" sortKey="total" activeKey={sortKey} dir={dir} onSort={toggle} align="center" className="px-4 py-3 text-xs uppercase" />
```

After:
```tsx
                  <SortableHeader label="거래명" sortKey="title" activeKey={sortKey} dir={dir} onSort={toggle} className="px-4 py-3 text-xs uppercase" />
                  <th className="px-4 py-3 text-left font-bold text-foreground text-xs uppercase">작업자</th>
                  <SortableHeader label="총 합계" sortKey="total" activeKey={sortKey} dir={dir} onSort={toggle} align="center" className="px-4 py-3 text-xs uppercase" />
```

- [ ] **Step 2-5: `invoices/page.tsx` — 본문 행에 "작업자" `td` 추가**

거래명 `td`(`:201~205`) 다음, 총 합계 `td`(`:206~208`) 앞에 payouts 와 동일한 작업자 셀을 넣는다.

Before (`src/app/(dashboard)/invoices/page.tsx:201~208`):
```tsx
                      <td className="px-4 py-3">
                        <Link href={`/invoices/${inv.id}`} className="text-foreground hover:text-primary transition">
                          {inv.title}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-center text-foreground font-medium tabular-nums whitespace-nowrap">
                        {formatWon(totals.grandTotal)}
                      </td>
```

After:
```tsx
                      <td className="px-4 py-3">
                        <Link href={`/invoices/${inv.id}`} className="text-foreground hover:text-primary transition">
                          {inv.title}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        {writerSummary(inv.items ?? [])}
                      </td>
                      <td className="px-4 py-3 text-center text-foreground font-medium tabular-nums whitespace-nowrap">
                        {formatWon(totals.grandTotal)}
                      </td>
```

> 헤더 컬럼 수(6→7)와 본문 셀 수(6→7)가 일치하는지 확인. 빈 상태/로딩 분기는 별도 메시지 행이라 colSpan 영향 없음.

### 검증 (Task 2)

- [ ] `npx eslint src/lib/invoice/writerSummary.ts "src/app/(dashboard)/payouts/page.tsx" "src/app/(dashboard)/invoices/page.tsx"` → 0 error (미사용 import 잔여 없음 확인)
- [ ] `npm run type-check` → 0 error
- [ ] `npm run build` → 0 error
- [ ] 동작 확인(가능 시): 거래처 청구서 목록에 "작업자" 컬럼이 거래명 우측에 표시되고, 내부 지급서와 동일하게 최대 3명 + "외 N명" 으로 표시되는지 확인.
- [ ] DRY 확인: `writerSummary` 로직이 `src/lib/invoice/writerSummary.ts` 한 곳에만 존재하고, 두 페이지가 import 로 재사용하는지 Grep 으로 확인.

---

## Self-Review 체크리스트

- [ ] "귀속금액"/"귀속 금액" UI 라벨 8곳이 모두 "회사 수수료"로 교체되었는가? (InvoiceForm 2곳, InvoicePreview 2곳, excelExport 2곳, payouts 2곳)
- [ ] "작가수수료(%)" → "작가 수수료(%)" 1곳 교체되었는가?
- [ ] 비변경 목록의 주석·테스트 설명·인터페이스 프로퍼티 주석·`attribution*` 식별자가 **하나도 변경되지 않았는가?** (`sortKey="attribution"`, `totals.attributionTotal`, payouts:46 주석 포함)
- [ ] `writerSummary` 로직이 공용 유틸 1곳에만 존재하고, payouts·invoices 양쪽이 import 로 재사용하는가? (복붙 없음)
- [ ] 공용 유틸 시그니처가 `writerSummary(items: InvoiceItem[]): string` 이고 호출부가 `inv.items ?? []` 를 넘기는가?
- [ ] payouts 에서 더는 쓰지 않는 `getInternalItems` import 가 제거되어 미사용 import eslint 에러가 없는가? (다른 사용처 없을 때)
- [ ] 거래처 청구서 목록 헤더/본문 컬럼 수가 7개로 일치하는가?
- [ ] `any` 미사용, 들여쓰기 2칸, 한국어 주석 규칙 준수했는가?
- [ ] `npm run type-check` · `npx eslint <변경 파일들>` · `npm run build` 가 모두 0 error 인가?
- [ ] 계산 로직·라우트·식별자 불변, 라벨/표시 변경만 했는가?
- [ ] 커밋/푸시/머지는 사용자 명시 지시 전까지 수행하지 않았는가?
