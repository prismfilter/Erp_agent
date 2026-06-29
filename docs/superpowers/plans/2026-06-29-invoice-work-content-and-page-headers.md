# 청구서 "작업내용" 통합 + 전 메뉴 헤더 구분선 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 청구서 폼의 "항목 + 상세내용" 두 열을 가격표 기반 "작업내용" 한 열로 통합하고(항목 재선택 시 갱신 안 되는 버그 포함 해결), 거래처 청구서·내부 지급서·엑셀에 "작업내용"이 노출되게 하며, 모든 메뉴 페이지 헤더 제목 밑에 통일된 구분선을 넣는다.

**Architecture:** DB 컬럼 `invoice_items.description`은 그대로 두고(마이그레이션 없음, 안전) UI 개념만 "작업내용"으로 바꾼다. `description`은 이제 **선택된 가격표 항목명으로 항상 자동 동기화**되는 파생값이 된다. 자유 텍스트 커스텀 입력은 폐지(가격표 항목만 허용). 헤더 구분선은 재사용 `PageHeader` 컴포넌트로 전 페이지에 통일 적용한다.

**Tech Stack:** Next.js 16 (App Router) · React 19 · TypeScript(strict, `any` 금지) · Tailwind v4 · base-ui dropdown. 데이터 흐름: `InvoiceForm` → `/api/invoices` → `itemsRepo.insertItems` → DB; 표시: `InvoicePreview`(화면/인쇄) + `excelExport`(엑셀).

## Global Constraints

- `any` 타입 금지, TypeScript strict. 들여쓰기 2칸. 주석·문서 한국어, 변수/함수명 영어.
- 클릭 가능한 모든 요소는 `cursor-pointer`.
- 폼 입력칸·라벨은 기본 가운데 정렬. "텍스트 가운데 정렬"은 **텍스트만** 중앙, 아이콘은 우측 고정.
- 스크롤 생기는 드롭다운/팝오버는 `gradient-scroll` 적용(기존 `PriceItemSelect`가 이미 사용).
- DB 컬럼 리네임·마이그레이션 **금지**(`description` 필드명 유지). 정산 로직 변경 금지.
- 커밋·푸시·머지는 **사용자가 명시적으로 지시할 때만**. `.mcp.json`·`.claude/agent-memory/*` 커밋 금지.
- 검증: `npm run type-check` → `npm run lint` → `npm run build` 무오류. 시각 검증은 dev 서버(http://localhost:3001) + Playwright.
- 의사결정(확정): ① 작업내용은 **가격표 항목만** 허용(자유 텍스트 커스텀 폐지). ② 헤더 구분선 **전 메뉴 일괄** 적용.

---

## File Structure

**Part A — 청구서 작업내용 통합 (우선순위)**
- `src/components/invoice/PriceItemSelect.tsx` — 수정: "직접 입력(커스텀)" 옵션 제거.
- `src/components/invoice/InvoiceForm.tsx` — 수정: 상세내용 열 삭제·항목→작업내용·항목명 항상 동기화(버그 해결)·저장 검증·폼 폭 축소(중앙 정렬).
- `src/components/invoice/InvoicePreview.tsx` — 수정: 표 헤더 `상세내용` → `작업내용`(외부/내부 공용 1곳).
- `src/lib/invoice/excelExport.ts` — 수정: 시트 헤더 `상세내용` → `작업내용`(2곳: line 74, 116).
- `src/app/(dashboard)/invoices/new/page.tsx` — 수정: 제목 `새 청구서` → `청구서 작성`.

**Part B — 전 메뉴 헤더 구분선**
- `src/components/layout/PageHeader.tsx` — 신규: 제목+설명+액션+하단 구분선 재사용 컴포넌트.
- 대시보드 각 페이지 `page.tsx`(아래 Task 7~10에 파일별 명시) — 헤더 블록을 `PageHeader`로 교체하거나 동등한 구분선 적용.

**변경하지 않음(중요):** `src/types/invoice.ts`(`description` 유지), `src/lib/validation/schemas.ts`(`invoiceItemInputSchema.description` 유지), `src/lib/invoice/itemsRepo.ts`(`description` 저장 유지), `src/lib/invoice/calculator.ts`(`stripTitlePrefix`는 구데이터 호환 위해 유지), `src/components/settlement/SettlementPreview.tsx`(용역정산은 범위 밖).

---

## Part A — 청구서 작업내용 통합

### Task 1: PriceItemSelect — 가격표 항목만 허용("직접 입력" 제거)

**Files:**
- Modify: `src/components/invoice/PriceItemSelect.tsx:152-160`

**Interfaces:**
- Consumes: `priceItems: PriceItem[]`, `selectedId: string | null`, `onSelect: (item: PriceItem | null) => void`.
- Produces: 시그니처 유지(`onSelect`는 항상 비-null `PriceItem`만 전달. null 경로는 더 이상 UI에서 발생하지 않음).

- [ ] **Step 1: "직접 입력(커스텀 항목)" 버튼 제거**

`src/components/invoice/PriceItemSelect.tsx`의 스크롤 리스트 상단 커스텀 버튼(현재 152~160행)을 삭제한다. 삭제 대상:

```tsx
        {/* 커스텀(직접 입력) 옵션 */}
        <button
          type="button"
          onClick={() => { onSelect(null); close(); }}
          className="w-full px-3 py-2 text-xs text-left hover:bg-primary/10 text-muted-foreground italic inline-flex items-center gap-1.5"
        >
          <SquarePen className="w-3.5 h-3.5" /> 직접 입력 (커스텀 항목)
        </button>

```

삭제 후 스크롤 리스트(`<div className="gradient-scroll ...">`)의 첫 자식은 `{grouped.length === 0 ? ... : ...}` 삼항이 된다.

- [ ] **Step 2: 미사용 import 제거**

상단 import에서 `SquarePen`이 이 파일에서 더 이상 쓰이지 않으면 제거한다(현재 8행 `import { SquarePen } from 'lucide-react';`). 파일 내 `SquarePen` 사용처가 위 버튼 1곳뿐이므로 import 줄 전체 삭제.

- [ ] **Step 3: 타입 체크**

Run: `npm run type-check`
Expected: 오류 없음(미사용 변수/ import 경고 없음).

- [ ] **Step 4: 커밋 (사용자 지시 시에만 — 기본은 커밋하지 않음)**

> 커밋은 이 계획 전체 완료 후 사용자가 지시할 때 일괄 수행. 개별 태스크에서 자동 커밋하지 않는다.

---

### Task 2: InvoiceForm — 작업내용 통합·버그 해결·폼 폭 축소

**Files:**
- Modify: `src/components/invoice/InvoiceForm.tsx`

**Interfaces:**
- Consumes: `PriceItemSelect`(Task 1), `InvoiceItem`(타입 그대로), `isBandCategory`, `calcItemBreakdown`.
- Produces: 폼 라인 1개당 `description = 선택 항목명`(파생). 저장 payload 구조 불변(`items` 그대로).

- [ ] **Step 1: 항목 선택 자동입력을 "항목명 항상 동기화"로 변경 (버그 해결)**

`handlePriceSelect`(현재 130~155행)의 비-null 분기에서 `description` 라인을 교체한다. 기존:

```tsx
            // 상세내용 자동 생성: {거래명}_{항목명} (이미 입력했으면 유지)
            description: it.description.trim() ? it.description : (title ? `${title}_${p.name}` : p.name),
```

변경:

```tsx
            // 작업내용 = 항목명 (항목 재선택 시에도 항상 동기화)
            description: p.name,
```

그리고 `handlePriceSelect`의 `useCallback` 의존성에서 `title`을 제거한다(더 이상 사용 안 함). 현재 155행 `[title]` → `[]`. 함수 시그니처/본문의 `null` 분기는 방어적으로 유지(호출되지 않음).

- [ ] **Step 2: 테이블 헤더 — `항목`→`작업내용`, `상세내용` 열 삭제**

`<thead>`(현재 392~404행)에서 `항목` 헤더의 라벨과 `상세내용` 헤더 한 줄을 정리한다. 기존:

```tsx
                <th className="px-2 py-2.5 text-center font-bold text-foreground min-w-[180px]">항목</th>
                <th className="px-2 py-2.5 text-center font-bold text-foreground min-w-[220px]">상세내용</th>
```

변경(상세내용 `<th>` 삭제, 항목→작업내용, 폭 확대):

```tsx
                <th className="px-2 py-2.5 text-center font-bold text-foreground min-w-[240px]">작업내용</th>
```

- [ ] **Step 3: 테이블 바디 — 작업내용 셀 통합, 상세내용 입력 셀 삭제**

라인 렌더(현재 419~452행)에서 "항목" `<td>`의 자식 라벨을 정리하고, 그 뒤의 "상세내용" `<td>`(현재 444~452행, `<input ... placeholder="상세내용" ...>`)를 **통째로 삭제**한다.

항목 `<td>`의 child 분기(현재 422~423행)는 작업내용(항목명)을 보여주도록 바꾼다. 기존:

```tsx
                      ) : isChild ? (
                        <span className="block text-center text-muted-foreground italic text-[11px]">내부 분리 행</span>
                      ) : (
```

변경:

```tsx
                      ) : isChild ? (
                        <span className="block text-center text-muted-foreground italic text-[11px]">
                          {it.description || '내부 분리 행'}
                        </span>
                      ) : (
```

이어서 바로 아래 "상세내용" `<td>` 블록 전체를 삭제:

```tsx
                    <td className="px-2 py-2">
                      <input
                        type="text"
                        value={it.description}
                        onChange={(e) => updateItem(it.id!, { description: e.target.value })}
                        placeholder="상세내용"
                        className="w-full px-2 py-1.5 text-center bg-background border border-border rounded outline-none focus:border-primary text-foreground"
                      />
                    </td>
```

- [ ] **Step 4: 저장 검증 — 가격표 항목 미선택 행 차단**

`handleSave`(현재 240~243행) 초반 검증에 항목 선택 검증을 추가한다. 기존:

```tsx
    if (!title.trim()) { setError('거래명을 입력하세요.'); return; }
    if (!invoiceDate) { setError('날짜를 선택하세요.'); return; }
```

변경(아래 한 줄 추가 — 할인행·내부분리 자식행은 제외, 그 외 행은 항목 필수):

```tsx
    if (!title.trim()) { setError('거래명을 입력하세요.'); return; }
    if (!invoiceDate) { setError('날짜를 선택하세요.'); return; }
    const missing = items.some(
      (it) => !it.group_key && it.item_type !== 'discount' && !it.price_item_id
    );
    if (missing) { setError('작업내용(항목)을 선택하지 않은 행이 있습니다.'); return; }
```

- [ ] **Step 5: 폼 폭 축소·중앙 정렬 (블럭 좌우 균형)**

루트 컨테이너(현재 296행) `<div className="space-y-6">`를 폭 제한·중앙 정렬로 바꾼다:

```tsx
    <div className="space-y-6 max-w-5xl mx-auto">
```

- [ ] **Step 6: 타입·린트·빌드**

Run: `npm run type-check && npm run lint && npm run build`
Expected: 무오류. (미사용 `title` 경고 없도록 Step 1의 의존성 정리 확인.)

- [ ] **Step 7: Playwright 시각 검증 — 버그 해결 확인**

dev 서버(http://localhost:3001) 가동 상태에서:
1. `/invoices/new` 이동.
2. 1행 작업내용 드롭다운에서 항목 A 선택 → 표에 항목명 표시 확인.
3. 같은 드롭다운에서 항목 B로 **재선택** → 작업내용이 B의 항목명으로 **갱신**되는지 확인(기존 버그: 갱신 안 됨).
4. 상세내용 열이 사라지고 표 폭이 좁아져 좌우 균형이 맞는지 확인.
Expected: 재선택 시 작업내용 즉시 갱신, 상세내용 열 없음, 블럭 폭 축소.

---

### Task 3: InvoicePreview — 표 헤더 "상세내용" → "작업내용"

**Files:**
- Modify: `src/components/invoice/InvoicePreview.tsx:99`

**Interfaces:**
- Consumes: `invoice.items`(각 `it.description` = 항목명). 렌더는 기존 `stripTitlePrefix(it.description, invoice.title)` 유지(구데이터 `{거래명}_항목명` 호환).
- Produces: 외부(거래처 청구서)·내부(내부 지급서) 공용 헤더 1곳 변경.

- [ ] **Step 1: 헤더 라벨 변경**

`src/components/invoice/InvoicePreview.tsx`의 표 헤더(현재 99행) 변경:

```tsx
            <th className="px-3 py-2.5 text-center font-bold">상세내용</th>
```
→
```tsx
            <th className="px-3 py-2.5 text-center font-bold">작업내용</th>
```

- [ ] **Step 2: 빌드 + Playwright 확인**

Run: `npm run build`
이어서 `/invoices/{기존 청구서 id}`에서 "거래처 청구서"·"내부 지급서" 두 탭 모두 표 헤더가 "작업내용"으로 표시되는지 확인.
Expected: 두 탭 모두 헤더 "작업내용", 셀 내용은 항목명.

---

### Task 4: excelExport — 시트 헤더 "상세내용" → "작업내용"

**Files:**
- Modify: `src/lib/invoice/excelExport.ts:74` (거래처 청구서 시트), `:116` (내부 지급서 시트)

- [ ] **Step 1: 외부 시트 헤더 변경 (line 74)**

```tsx
      { text: '상세내용', align: 'left' },
```
→
```tsx
      { text: '작업내용', align: 'left' },
```

- [ ] **Step 2: 내부 시트 헤더 변경 (line 116)**

동일하게 `{ text: '상세내용', align: 'left' }` → `{ text: '작업내용', align: 'left' }`. (두 줄 모두 동일 문자열이므로 각 위치를 확인하고 둘 다 변경. 렌더 행의 `stripTitlePrefix(it.description, ...)`는 변경하지 않음.)

- [ ] **Step 3: 빌드 + 다운로드 확인**

Run: `npm run build`
이어서 청구서 상세에서 "엑셀 다운로드" → 두 시트 모두 헤더가 "작업내용"인지 확인.
Expected: 거래처 청구서·내부 지급서 시트 헤더 모두 "작업내용".

---

### Task 5: 새 청구서 페이지 제목 변경

**Files:**
- Modify: `src/app/(dashboard)/invoices/new/page.tsx:11`

> 본 태스크는 Task 6(PageHeader) 완료 후 함께 적용해도 무방. 단독 적용 시 제목 문자열만 바꾼다.

- [ ] **Step 1: 제목 문자열 변경**

```tsx
        <h1 className="text-3xl font-bold text-foreground mb-2">새 청구서</h1>
```
→
```tsx
        <h1 className="text-3xl font-bold text-foreground mb-2">청구서 작성</h1>
```

- [ ] **Step 2: 빌드 확인**

Run: `npm run build` → 무오류. `/invoices/new` 제목이 "청구서 작성"인지 확인.

---

## Part B — 전 메뉴 헤더 구분선 (PageHeader 통일)

> 참고 기준: 작가 마스터 페이지의 헤더 밑 가로 구분선 스타일(`border-b border-border`). 모든 메뉴 페이지의 제목 블록 아래에 동일한 가로 구분선을 통일 적용한다. 제목은 고정(정적) 헤더로 두고 그 밑에 구분선을 둔다(스티키 아님 — 참고 페이지와 동일).

### Task 6: PageHeader 재사용 컴포넌트 생성

**Files:**
- Create: `src/components/layout/PageHeader.tsx`

**Interfaces:**
- Produces:
  ```ts
  interface PageHeaderProps {
    title: string;
    description?: React.ReactNode;   // 부제(선택)
    actions?: React.ReactNode;       // 우측 버튼/액션 영역(선택)
    titleClassName?: string;         // 제목 폰트 크기 등 페이지별 미세조정
    className?: string;              // 컨테이너 추가 클래스
  }
  export function PageHeader(props: PageHeaderProps): JSX.Element
  ```
  렌더 구조: 좌측 제목+부제 / 우측 액션, 하단 `border-b border-border pb-4` 구분선.

- [ ] **Step 1: 컴포넌트 작성**

`src/components/layout/PageHeader.tsx` 신규 생성:

```tsx
// 페이지 공통 헤더 — 제목+부제+우측 액션, 하단 가로 구분선(전 메뉴 통일)
// 작가 마스터 헤더 구분선 스타일(border-b border-border)을 모든 메뉴에 일관 적용.

import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  titleClassName?: string;
  className?: string;
}

export function PageHeader({
  title,
  description,
  actions,
  titleClassName,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={`flex flex-wrap items-start justify-between gap-3 border-b border-border pb-4 ${className ?? ''}`}
    >
      <div>
        <h1
          className={`text-3xl font-bold text-foreground ${description ? 'mb-2' : ''} ${titleClassName ?? ''}`}
        >
          {title}
        </h1>
        {description && <p className="text-muted-foreground text-sm">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
```

- [ ] **Step 2: 타입 체크**

Run: `npm run type-check` → 무오류.

**마이그레이션 레시피(Task 7~10 공통):** 각 페이지에서
1. `import { PageHeader } from '@/components/layout/PageHeader';` 추가.
2. 기존 헤더 블록(제목 `<h1>` + 부제 `<p>` + 우측 버튼들을 감싼 `<div>`)을 `<PageHeader title="..." description={...} actions={<>...</>} />`로 교체.
3. **우측 버튼/탭/액션은 그대로 `actions`로 이전**(기능·핸들러 보존). 제목 폰트가 `text-2xl`인 상세/폼 페이지는 `titleClassName="text-2xl"` 전달.
4. 헤더 바로 아래 별도 탭바가 있어 이미 `border-b`가 있는 경우(예: 청구서 상세, 작가 마스터) **이중 구분선이 되지 않도록**: PageHeader는 제목용 구분선을 담당하고, 탭바는 유지하되 시각적으로 과하면 탭바 컨테이너의 상단 여백(`mt`)으로 간격만 확보(아래 각 태스크에 명시).

---

### Task 7: PageHeader 적용 — 청구서·지급서 영역

**Files:**
- Modify: `src/app/(dashboard)/invoices/page.tsx:114` (거래처 청구서 목록)
- Modify: `src/app/(dashboard)/invoices/new/page.tsx` (청구서 작성 — Task 5 제목 포함)
- Modify: `src/app/(dashboard)/invoices/[id]/edit/page.tsx:48-53` (청구서 수정)
- Modify: `src/app/(dashboard)/payouts/page.tsx:52` (내부 지급서)
- Modify: `src/app/(dashboard)/invoices/[id]/page.tsx:84-112` (청구서 상세 — 액션 버튼 다수)

- [ ] **Step 1: 청구서 작성(new) 적용**

`src/app/(dashboard)/invoices/new/page.tsx` 헤더 교체:

```tsx
import { InvoiceForm } from '@/components/invoice/InvoiceForm';
import { PageHeader } from '@/components/layout/PageHeader';

export default function NewInvoicePage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="청구서 작성"
        description="프라이스 테이블에서 작업내용(항목)을 선택하면 금액이 자동 입력됩니다. 협의가는 자유롭게 수정하세요."
      />
      <InvoiceForm />
    </div>
  );
}
```

- [ ] **Step 2: 청구서 수정(edit) 적용**

`src/app/(dashboard)/invoices/[id]/edit/page.tsx`의 헤더 블록(48~53행)을 교체. `import { PageHeader } from '@/components/layout/PageHeader';` 추가 후:

```tsx
      <PageHeader title="청구서 수정" titleClassName="text-2xl" description={invoice.title} />
```
(기존 `<div><h1 ...>청구서 수정</h1><p ...>{invoice.title}</p></div>` 대체.)

- [ ] **Step 3: 거래처 청구서 목록·내부 지급서 적용**

`src/app/(dashboard)/invoices/page.tsx`(114행 인근)와 `src/app/(dashboard)/payouts/page.tsx`(52행 인근)의 헤더 블록을 각 파일에서 읽어 레시피대로 `PageHeader`로 교체한다. 제목은 각각 `거래처 청구서`, `내부 지급서`. 기존 부제 `<p>`가 있으면 `description`으로, 우측 버튼(있으면)은 `actions`로 이전한다. (두 파일의 정확한 헤더 마크업은 구현 시 Read로 확인.)

- [ ] **Step 4: 청구서 상세 적용(액션 보존)**

`src/app/(dashboard)/invoices/[id]/page.tsx`의 상단 헤더(84~112행, `print:hidden`)를 `PageHeader`로 교체하되 `print:hidden`을 `className`으로 전달하고, 수정·엑셀·인쇄 버튼 묶음을 `actions`로 이전:

```tsx
      <PageHeader
        className="print:hidden"
        titleClassName="text-2xl"
        title={invoice.title}
        description={`${invoice.client?.name ?? '거래처 미지정'} · ${invoice.invoice_date}`}
        actions={
          <>
            {/* 기존 수정 Link, 엑셀 button, 인쇄 button을 그대로 이동 */}
          </>
        }
      />
```
바로 아래 탭바(`<div className="print:hidden flex ... border-b border-border">`, 115행)는 유지. 제목 구분선과 탭바 사이 간격이 과하면 탭바 컨테이너에 `mt-2`만 추가.

- [ ] **Step 5: 빌드 + 시각 확인**

Run: `npm run build`
`/invoices`, `/invoices/new`, `/payouts`, 임의 `/invoices/{id}`, `/invoices/{id}/edit`에서 제목 밑 구분선 표시·기존 버튼/탭 동작 정상 확인.

---

### Task 8: PageHeader 적용 — 관리(admin) 페이지군

**Files:**
- Modify: `src/app/(dashboard)/admin/writers/page.tsx:175-194` (작가 마스터 — 탭바 이중선 주의)
- Modify: `src/app/(dashboard)/admin/clients/page.tsx:96` (거래처 DB)
- Modify: `src/app/(dashboard)/admin/accounts/page.tsx:217` (계정 관리)
- Modify: `src/app/(dashboard)/admin/price-table/page.tsx:216` (프라이스 테이블)
- Modify: `src/app/(dashboard)/admin/works/permanent/page.tsx:169` (영구 저작물 DB)
- Modify: `src/app/(dashboard)/admin/works/general/page.tsx:8` (일반 저작물 DB)

- [ ] **Step 1: 작가 마스터(이중 구분선 처리)**

`admin/writers/page.tsx`의 헤더 블록(175~194행)을 `PageHeader`로 교체(`title="작가 마스터"`, `description`은 기존 부제, `actions`는 `+ 등록` 버튼). 이미 탭바(305~306행)에 `border-b border-border mb-10`가 있으므로 **탭바의 `border-b border-border`는 유지**(작가 마스터가 통일의 기준점이므로 시각 동일). PageHeader 구분선 + 탭바 사이 등록폼/탭 간격은 기존 `space-y-6`로 충분 — 과하면 조정하지 않는다.

- [ ] **Step 2: 나머지 admin 페이지 일괄 적용**

`clients/page.tsx`, `accounts/page.tsx`, `price-table/page.tsx`, `works/permanent/page.tsx`, `works/general/page.tsx` 각각을 Read로 헤더 마크업 확인 후 레시피대로 `PageHeader`로 교체. 제목은 각각 `거래처 DB`, `계정 관리`, 프라이스 테이블 페이지의 기존 제목 문자열, `영구 저작물 DB`, `일반 저작물 DB`. 우측 버튼/검색 등 액션은 `actions`로 보존. `works/general/page.tsx`는 헤더가 `<div>` 단순 구조이므로 그대로 교체.

- [ ] **Step 3: 빌드 + 시각 확인**

Run: `npm run build`
각 admin 페이지에서 헤더 구분선·기존 기능 정상 확인. 작가 마스터는 구분선이 한 줄(제목 밑)로 자연스러운지 확인.

---

### Task 9: PageHeader 적용 — 기타 상위 메뉴 페이지

**Files:**
- Modify: `src/app/(dashboard)/page.tsx:126` (홈 피드)
- Modify: `src/app/(dashboard)/staff/page.tsx:182` (구성원)
- Modify: `src/app/(dashboard)/revenue/page.tsx:113` (매출현황)
- Modify: `src/app/(dashboard)/profile/page.tsx:96` (내 프로필 설정)
- Modify: `src/app/(dashboard)/settlement/service/page.tsx:195` (용역 정산 — 입력 화면 헤더)
- Modify: `src/app/(dashboard)/settlement/royalty/page.tsx:17` (해외 저작권료 정산)

- [ ] **Step 1: 단순 헤더 페이지 적용**

`page.tsx`(홈), `staff/page.tsx`, `revenue/page.tsx`, `profile/page.tsx`를 Read로 확인 후 레시피대로 `PageHeader`로 교체(제목: `홈 피드`, `구성원`, `매출현황`, `내 프로필 설정`). 우측 액션 보존.

- [ ] **Step 2: 정산 페이지 적용(조건부 헤더 주의)**

`settlement/service/page.tsx`는 정산서 표시(147행)와 입력화면(195행) 두 헤더가 조건부로 분기한다. **입력화면 헤더(195행 `용역 정산`)만** `PageHeader`로 교체(정산서 미리보기 화면의 `{writer_name} · 용역 정산서` 헤더는 인쇄/문서 레이아웃이므로 건드리지 않는다). `settlement/royalty/page.tsx`(17행 `해외 저작권료 정산`)는 헤더 블록을 `PageHeader`로 교체. 두 곳 모두 제목 폰트가 `text-2xl`이면 `titleClassName="text-2xl"`.

- [ ] **Step 3: 빌드 + 시각 확인**

Run: `npm run build`
홈/구성원/매출현황/프로필/용역정산/해외정산 헤더 구분선 정상, 정산서 미리보기 화면은 변경 없음 확인.

---

### Task 10: 헤더 구분선 — 상세·서브폼 페이지

**Files:**
- Modify: `src/app/(dashboard)/admin/writers/[id]/page.tsx:146` (작가 상세)
- Modify: `src/app/(dashboard)/admin/clients/[id]/page.tsx:125` (거래처 상세)
- Modify: `src/app/(dashboard)/admin/works/permanent/new/page.tsx:79` (저작물 추가)
- Modify: `src/app/(dashboard)/admin/works/permanent/[id]/edit/page.tsx:92` (저작물 수정)
- Modify: `src/app/(dashboard)/writer-portal/page.tsx:6` (나의 정산서)

- [ ] **Step 1: 상세 페이지 적용(뒤로가기·배지 보존)**

`writers/[id]/page.tsx`, `clients/[id]/page.tsx`는 헤더에 뒤로가기 링크·상태 배지 등이 포함될 수 있다. 각 파일을 Read로 확인 후, 제목 블록을 `PageHeader`(제목=엔티티명, `titleClassName="text-2xl"`)로 교체하고 **뒤로가기·배지·수정 버튼 등은 `actions` 또는 제목 위/우측 위치를 보존**한다. 헤더 구조가 복잡해 `PageHeader`가 어울리지 않으면, 최소 변경으로 기존 헤더 컨테이너에 `border-b border-border pb-4`만 추가해 동일한 구분선을 만든다(통일성 우선, 레이아웃 파손 금지).

- [ ] **Step 2: 서브폼·포털 페이지 적용**

`works/permanent/new/page.tsx`(저작물 추가), `works/permanent/[id]/edit/page.tsx`(저작물 수정, 제목 `text-lg`), `writer-portal/page.tsx`(나의 정산서, `text-2xl`)도 Read 후 `PageHeader`로 교체하거나 헤더 컨테이너에 `border-b border-border pb-4` 추가. 저작물 수정 헤더는 `titleClassName="text-lg"` 전달.

- [ ] **Step 3: 전체 빌드 + 린트 + 일괄 시각 점검**

Run: `npm run type-check && npm run lint && npm run build`
모든 대시보드 페이지를 순회하며 (1) 헤더 제목 밑 구분선이 통일되게 보이는지, (2) 기존 버튼/탭/뒤로가기/배지 기능이 보존됐는지 확인.
Expected: 전 메뉴 헤더 구분선 통일, 기능 회귀 없음.

---

## Self-Review (작성자 점검 결과)

**1. Spec coverage**
- ✅ 청구서 내용에 "상세 항목" 없이 "상세내용"만 나오는 문제 → 헤더/개념을 "작업내용"(항목명)으로 통합(Task 2·3·4).
- ✅ 항목 재선택 시 상세내용 갱신 안 되는 버그 → `description: p.name` 항상 동기화(Task 2 Step 1).
- ✅ "항목칸을 작업내용으로, 상세내용 목록 삭제" → Task 2 Step 2·3.
- ✅ "거래처 청구서·내부 지급서도 작업내용" → InvoicePreview(Task 3) + excelExport(Task 4).
- ✅ "새 청구서 → 청구서 작성" → Task 5/Task 7 Step 1.
- ✅ "헤더 제목 밑 구분선, 전 메뉴 통일(작가 마스터 참고)" → PageHeader(Task 6) + Task 7~10 전 페이지 적용.
- ✅ "블럭 크기 너무 커서 좌우 균형 맞게 축소" → 폼 `max-w-5xl mx-auto`(Task 2 Step 5).

**2. Placeholder scan**
- 청구서 핵심(Task 1~5)은 정확한 행/코드 제시 완료. Part B의 일부 페이지는 헤더 마크업이 파일마다 달라 "Read 후 레시피 적용"으로 지시 — 단, 레시피(import·교체·actions 보존·titleClassName)와 파일별 제목/행 번호를 명시해 모호성 제거.

**3. Type consistency**
- `PageHeaderProps`(title/description/actions/titleClassName/className)는 Task 6 정의와 Task 7~10 사용이 일치.
- `PriceItemSelect.onSelect` 시그니처 유지(Task 1) → `InvoiceForm.handlePriceSelect`(Task 2) 호출부 무변경.
- `description` 필드명은 타입/스키마/repo에서 불변 — 표시 라벨만 "작업내용".

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-06-29-invoice-work-content-and-page-headers.md`.**

권장 실행 순서: **Part A(Task 1~5)** 먼저 완료·검증(핵심 기능·버그) → 이후 **Part B(Task 6~10)** 헤더 구분선 스윕.

두 가지 실행 옵션:
1. **Subagent-Driven (권장)** — 태스크마다 새 subagent 디스패치 + 태스크 간 리뷰, 빠른 반복.
2. **Inline Execution** — 현재 세션에서 체크포인트로 일괄 실행.
