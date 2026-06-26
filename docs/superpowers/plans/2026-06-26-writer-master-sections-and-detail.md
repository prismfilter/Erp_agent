# 작가 마스터 섹션 분리 + 작가 상세 페이지 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 작가 마스터 페이지의 단일 표를 전속작가/일반작가 섹션 표로 분리하고(구분 컬럼 제거·상세정보 컬럼 추가), 작가 상세 페이지를 신설해 영문명·활동명·포지션(다중)·원작자 코드를 추가 관리한다.

**Architecture:** writers 테이블에 4개 nullable 컬럼(`english_name`, `stage_name`, `position TEXT[]`, `original_writer_code`)을 추가한다. 마스터 페이지는 탭(전체/전속/일반/해지)을 유지하되 표 렌더링을 재사용 컴포넌트 `WriterTable`로 추출해 `전체` 탭에서 전속·일반 2개 섹션을 세로로 표시한다. 작가 상세 페이지 `/admin/writers/[id]`는 기존 PATCH(generic 루프)·신규 GET을 통해 마스터 정보 전체와 신규 4필드를 편집한다.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript(strict), Tailwind v4, Supabase(PostgreSQL), zod v4, shadcn DropdownMenu, vitest.

## Global Constraints

- TypeScript strict — `any` 타입 금지. 들여쓰기 2칸. 한국어 주석.
- 마이그레이션은 forward-only(기존 마이그레이션 수정 금지, 신규 번호 025 추가). 적용은 Supabase SQL Editor에서 사용자가 실행(원격 DDL 토큰 없음).
- 커밋/푸시/머지는 사용자가 명시적으로 지시할 때만. `.mcp.json`·`.claude/agent-memory/*` 절대 커밋 금지.
- 클릭 가능한 요소는 항상 `cursor-pointer`. 드롭다운/팝오버 스크롤 영역은 `gradient-scroll` 클래스.
- "텍스트 가운데 정렬"은 텍스트만 중앙(아이콘은 우측 고정). 폼 라벨·입력은 기본 가운데 정렬.
- 메뉴/페이지 라우트는 유지. 권한: 조회 STAFF↑, 수정/삭제 ADMIN만(`requireStaff(true)`).
- 검증 게이트(매 작업 종료 시): `npm run type-check`, `npx eslint <변경파일>`(0 error), 해당 시 `npx vitest run`, 마지막 `npm run build`.

---

## File Structure

**생성:**
- `supabase/migrations/025_writer_detail_fields.sql` — writers 4컬럼 추가
- `src/lib/writers/position.ts` — 포지션 상수·라벨·표시 헬퍼(순수 함수)
- `src/lib/writers/position.test.ts` — 헬퍼 단위 테스트
- `src/components/writers/PositionSelect.tsx` — 포지션 다중 선택 드롭다운
- `src/components/writers/WriterTable.tsx` — 작가 표(헤더+행+인라인 셀) 재사용 컴포넌트
- `src/app/(dashboard)/admin/writers/[id]/page.tsx` — 작가 상세 페이지

**수정:**
- `src/types/invoice.ts` — Writer 인터페이스에 4필드 추가
- `src/lib/validation/schemas.ts` — writerCreateSchema·writerUpdateSchema에 4필드
- `src/app/api/writers/route.ts` — WRITER_SELECT 컬럼·POST insert 필드
- `src/app/api/writers/[id]/route.ts` — WRITER_SELECT 컬럼·GET 상세 핸들러 추가
- `src/app/(dashboard)/admin/writers/page.tsx` — 표를 WriterTable로 교체, 탭별 섹션 렌더, 인라인 셀 컴포넌트를 WriterTable로 이동

---

## Interfaces (전 작업 공유 시그니처)

```ts
// src/lib/writers/position.ts
export type PositionCode = 'A' | 'C' | 'AR';
export const POSITION_OPTIONS: readonly PositionCode[]; // ['A','C','AR']
export const POSITION_LABELS: Record<PositionCode, string>; // { A:'작사', C:'작곡', AR:'편곡' }
export function formatPositions(positions: string[]): string; // [] → '(미정)', ['A','C'] → '작사 · 작곡'

// src/types/invoice.ts (Writer 추가 필드)
//   english_name: string | null;
//   stage_name: string | null;
//   position: string[];            // ['A'|'C'|'AR'], 빈 배열 = 미정
//   original_writer_code: string | null;

// src/components/writers/PositionSelect.tsx
export function PositionSelect(props: {
  value: string[];
  onChange: (next: PositionCode[]) => void;
  editable?: boolean;
  triggerClassName?: string;
}): JSX.Element;

// src/components/writers/WriterTable.tsx
export function WriterTable(props: {
  writers: Writer[];
  isAdmin: boolean;
  sortKey: string | null;
  dir: 'asc' | 'desc';
  toggle: (key: string) => void;
  onPatch: (id: string, patch: Partial<Writer>) => Promise<void>;
  onDelete: (id: string) => void;
  focusId?: string | null;
}): JSX.Element;
```

---

## Task 1: DB 마이그레이션 + Writer 타입

**Files:**
- Create: `supabase/migrations/025_writer_detail_fields.sql`
- Modify: `src/types/invoice.ts:22-33`

**Interfaces:**
- Produces: writers 테이블 컬럼 `english_name TEXT`, `stage_name TEXT`, `position TEXT[] NOT NULL DEFAULT '{}'`, `original_writer_code TEXT`; Writer 타입에 동일 필드.

- [ ] **Step 1: 마이그레이션 파일 작성**

`supabase/migrations/025_writer_detail_fields.sql`:
```sql
-- ============================================================================
-- 작가 상세 정보 필드 추가 (025)
-- 작가 상세 페이지용: 영문명·활동명·포지션(A/C/AR 다중)·원작자 코드.
-- forward-only: 기존 마이그레이션 수정 금지.
-- ============================================================================

ALTER TABLE public.writers
  ADD COLUMN IF NOT EXISTS english_name         TEXT,
  ADD COLUMN IF NOT EXISTS stage_name           TEXT,
  ADD COLUMN IF NOT EXISTS position             TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS original_writer_code TEXT;

COMMENT ON COLUMN public.writers.english_name         IS '영문명';
COMMENT ON COLUMN public.writers.stage_name           IS '활동명';
COMMENT ON COLUMN public.writers.position             IS '포지션 A(작사)/C(작곡)/AR(편곡) 다중. 빈 배열=미정';
COMMENT ON COLUMN public.writers.original_writer_code IS '원작자 코드(실제 저작물에 쓰이는 작가코드)';
```

- [ ] **Step 2: 원격 DB에 적용**

Supabase 대시보드 → SQL Editor에 위 SQL 붙여넣고 Run. (Table Editor에서 writers에 4컬럼 추가 확인.)

- [ ] **Step 3: Writer 타입에 4필드 추가**

`src/types/invoice.ts` Writer 인터페이스(라인 22-33)의 `status` 위에 추가:
```ts
  recontract_date: string | null; // 전속작가 재계약일 (YYYY-MM-DD), null=미지정
  english_name: string | null;    // 영문명
  stage_name: string | null;      // 활동명
  position: string[];             // 포지션 ['A'|'C'|'AR'], 빈 배열=미정
  original_writer_code: string | null; // 원작자 코드(실제 저작물 작가코드)
  status: string;
```

- [ ] **Step 4: 타입 체크**

Run: `npm run type-check`
Expected: PASS (no errors)

- [ ] **Step 5: 커밋(사용자 지시 시에만 — 기본은 스킵)**

---

## Task 2: 포지션 헬퍼 + 단위 테스트 (TDD)

**Files:**
- Create: `src/lib/writers/position.ts`
- Test: `src/lib/writers/position.test.ts`

**Interfaces:**
- Produces: `PositionCode`, `POSITION_OPTIONS`, `POSITION_LABELS`, `formatPositions`.

- [ ] **Step 1: 실패하는 테스트 작성**

`src/lib/writers/position.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { formatPositions, POSITION_OPTIONS, POSITION_LABELS } from './position';

describe('formatPositions', () => {
  it('빈 배열은 (미정)', () => {
    expect(formatPositions([])).toBe('(미정)');
  });
  it('단일 포지션은 라벨 1개', () => {
    expect(formatPositions(['A'])).toBe('작사');
  });
  it('다중 포지션은 · 로 연결(옵션 순서 고정 A·C·AR)', () => {
    expect(formatPositions(['AR', 'A'])).toBe('작사 · 편곡');
  });
  it('알 수 없는 값은 무시', () => {
    expect(formatPositions(['A', 'X'])).toBe('작사');
  });
});

describe('상수', () => {
  it('옵션은 A/C/AR', () => {
    expect(POSITION_OPTIONS).toEqual(['A', 'C', 'AR']);
  });
  it('라벨 매핑', () => {
    expect(POSITION_LABELS).toEqual({ A: '작사', C: '작곡', AR: '편곡' });
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run src/lib/writers/position.test.ts`
Expected: FAIL ("Cannot find module './position'")

- [ ] **Step 3: 헬퍼 구현**

`src/lib/writers/position.ts`:
```ts
// 작가 포지션(저작물 역할) 코드·라벨·표시 헬퍼 (순수 함수)
// A(작사)/C(작곡)/AR(편곡), 다중 선택. 빈 배열 = 미정.

export type PositionCode = 'A' | 'C' | 'AR';

export const POSITION_OPTIONS: readonly PositionCode[] = ['A', 'C', 'AR'];

export const POSITION_LABELS: Record<PositionCode, string> = {
  A: '작사',
  C: '작곡',
  AR: '편곡',
};

// 표시 문자열: 빈 배열은 '(미정)', 그 외는 옵션 순서(A·C·AR)대로 라벨을 ' · '로 연결.
export function formatPositions(positions: string[]): string {
  const labels = POSITION_OPTIONS.filter((code) => positions.includes(code)).map(
    (code) => POSITION_LABELS[code]
  );
  return labels.length ? labels.join(' · ') : '(미정)';
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run src/lib/writers/position.test.ts`
Expected: PASS (6 tests)

- [ ] **Step 5: type-check + eslint**

Run: `npm run type-check && npx eslint src/lib/writers/position.ts src/lib/writers/position.test.ts`
Expected: PASS, 0 error

---

## Task 3: 검증 스키마 + API (신규 필드 + 상세 GET)

**Files:**
- Modify: `src/lib/validation/schemas.ts:78-98`
- Modify: `src/app/api/writers/route.ts`
- Modify: `src/app/api/writers/[id]/route.ts`

**Interfaces:**
- Consumes: `PositionCode`(개념상 — zod enum으로 직접 정의).
- Produces: `GET /api/writers/[id]` → `{ writer: Writer }`; POST/PATCH가 신규 4필드 수용.

- [ ] **Step 1: 스키마에 포지션 enum + 4필드 추가**

`src/lib/validation/schemas.ts`에서 `WRITER_TYPE` 정의 아래에 추가:
```ts
const WRITER_POSITION = z.enum(['A', 'C', 'AR']);
```

`writerCreateSchema`에 `recontract_date` 아래 추가:
```ts
  english_name: z.string().trim().nullable().optional(),
  stage_name: z.string().trim().nullable().optional(),
  position: z.array(WRITER_POSITION).optional(),
  original_writer_code: z.string().trim().nullable().optional(),
```

`writerUpdateSchema`에 `status` 위/아래로 동일 4필드 추가:
```ts
  english_name: z.string().trim().nullable().optional(),
  stage_name: z.string().trim().nullable().optional(),
  position: z.array(WRITER_POSITION).optional(),
  original_writer_code: z.string().trim().nullable().optional(),
```

- [ ] **Step 2: WRITER_SELECT에 컬럼 추가**

`src/app/api/writers/route.ts`의 WRITER_SELECT 상수(라인 10-11)를 다음으로 교체:
```ts
const WRITER_SELECT =
  'id, writer_code, name, writer_type, fee_rate, permanent_rate, general_rate, recontract_date, english_name, stage_name, position, original_writer_code, status, created_at';
```

> `src/app/api/writers/[id]/route.ts`에도 동일한 WRITER_SELECT가 있으면 같은 문자열로 갱신할 것(없으면 Step 4에서 추가).

- [ ] **Step 3: POST insert에 신규 필드 추가**

`src/app/api/writers/route.ts` POST의 `parsed.data` 구조분해와 insert에 반영:
```ts
const { name, writer_type, fee_rate, permanent_rate, general_rate, recontract_date,
        english_name, stage_name, position, original_writer_code } = parsed.data;
```
insert 객체에 추가:
```ts
        recontract_date: recontract_date ?? null,
        english_name: english_name ?? null,
        stage_name: stage_name ?? null,
        position: position ?? [],
        original_writer_code: original_writer_code ?? null,
```

- [ ] **Step 4: GET 상세 핸들러 추가**

`src/app/api/writers/[id]/route.ts` 상단에 WRITER_SELECT가 없다면 추가하고, GET 핸들러를 신설:
```ts
// 작가 단건 조회용 컬럼(목록과 동일)
const WRITER_SELECT =
  'id, writer_code, name, writer_type, fee_rate, permanent_rate, general_rate, recontract_date, english_name, stage_name, position, original_writer_code, status, created_at';

// GET /api/writers/[id] — 작가 단건 조회 (조회는 STAFF↑)
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireStaff();
    if (isErrorResponse(auth)) return auth;
    const { id } = await params;
    const { data, error } = await auth.adminClient
      .from('writers')
      .select(WRITER_SELECT)
      .eq('id', id)
      .single();
    if (error?.code === 'PGRST116') {
      return NextResponse.json({ error: '작가를 찾을 수 없습니다.' }, { status: 404 });
    }
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ writer: data });
  } catch (err) {
    console.error('작가 상세 조회 API 오류:', err);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
```
> 기존 PATCH의 generic 루프(`value !== undefined`)가 신규 필드도 자동 반영하므로 PATCH 로직 변경 불필요. PATCH가 자체 WRITER_SELECT를 참조하면 Step 2 문자열과 일치시킬 것.

- [ ] **Step 5: 타입 체크 + eslint + build**

Run: `npm run type-check && npx eslint src/lib/validation/schemas.ts "src/app/api/writers/route.ts" "src/app/api/writers/[id]/route.ts"`
Expected: PASS, 0 error

- [ ] **Step 6: 상세 GET 동작 확인**

개발 서버에서 `/api/writers` 목록의 임의 id로 `GET /api/writers/<id>` 호출 → `{ writer: {...position:[]...} }` 200 응답 확인(브라우저/네트워크 탭).

---

## Task 4: PositionSelect 컴포넌트 (다중 선택)

**Files:**
- Create: `src/components/writers/PositionSelect.tsx`

**Interfaces:**
- Consumes: `POSITION_OPTIONS`, `POSITION_LABELS`, `PositionCode`, `formatPositions` (Task 2).
- Produces: `PositionSelect` (위 Interfaces 시그니처).

- [ ] **Step 1: 컴포넌트 작성**

`src/components/writers/PositionSelect.tsx`:
```tsx
'use client';

// 작가 포지션 다중 선택 — A(작사)/C(작곡)/AR(편곡) 체크박스 드롭다운.
// 선택 없음 = (미정). shadcn DropdownMenu 체크박스 아이템 사용.

import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu';
import { POSITION_OPTIONS, POSITION_LABELS, formatPositions, type PositionCode } from '@/lib/writers/position';

export function PositionSelect({
  value,
  onChange,
  editable = true,
  triggerClassName,
}: {
  value: string[];
  onChange: (next: PositionCode[]) => void;
  editable?: boolean;
  triggerClassName?: string;
}) {
  // 읽기전용: 표시만
  if (!editable) {
    return <span className="text-sm text-foreground">{formatPositions(value)}</span>;
  }

  const toggle = (code: PositionCode, checked: boolean) => {
    const set = new Set(value.filter((v): v is PositionCode => (POSITION_OPTIONS as readonly string[]).includes(v)));
    if (checked) set.add(code);
    else set.delete(code);
    // 옵션 순서(A·C·AR)로 정규화해 저장
    onChange(POSITION_OPTIONS.filter((c) => set.has(c)));
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        title="포지션 선택"
        className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-foreground text-sm border border-border hover:border-primary transition cursor-pointer ${triggerClassName ?? ''}`}
      >
        {formatPositions(value)}
        <span className="text-[10px] opacity-70" aria-hidden="true">▾</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center" className="min-w-36 bg-card border border-border">
        {POSITION_OPTIONS.map((code) => (
          <DropdownMenuCheckboxItem
            key={code}
            checked={value.includes(code)}
            onCheckedChange={(checked) => toggle(code, Boolean(checked))}
            className="text-foreground cursor-pointer"
          >
            {POSITION_LABELS[code]} ({code})
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

- [ ] **Step 2: DropdownMenuCheckboxItem export 확인**

Run: `npx eslint src/components/writers/PositionSelect.tsx`
Expected: 0 error.
만약 `DropdownMenuCheckboxItem`이 `src/components/ui/dropdown-menu.tsx`에 없으면, 같은 파일의 `DropdownMenuRadioItem` 패턴을 본떠 base-ui `MenuPrimitive.CheckboxItem` 래퍼를 추가(체크 표시는 `data-checked` 활용)하고 export.

- [ ] **Step 3: 타입 체크**

Run: `npm run type-check`
Expected: PASS

---

## Task 5: 작가 마스터 페이지 — WriterTable 추출 + 구분 제거 + 상세정보 컬럼 + 섹션 렌더

**Files:**
- Create: `src/components/writers/WriterTable.tsx`
- Modify: `src/app/(dashboard)/admin/writers/page.tsx`

**Interfaces:**
- Consumes: Writer 타입, 인라인 셀 컴포넌트(이동), `useTableSort` 결과.
- Produces: `WriterTable`(위 Interfaces 시그니처). 페이지는 탭에 따라 WriterTable을 1~2회 렌더.

- [ ] **Step 1: 인라인 셀 + 표를 WriterTable로 이동**

`src/components/writers/WriterTable.tsx` 신설. `admin/writers/page.tsx`에 정의된 다음 항목을 **이 파일로 이동**(export 불필요, 파일 내부 사용): `typeBadge`, `NameCell`, `FeeRateCell`, `NullableRateCell`, `DateCell`, `ContractStatusCell`, 그리고 `SortableHeader` import. (`WriterTypeSelect`는 더 이상 표에서 쓰지 않으므로 이동하지 않음 — 페이지의 등록 폼에서만 사용.)

`WriterTable` 본체(표 헤더·바디). **구분 컬럼 제거**, **재계약일과 계약상태 사이에 '상세정보' 컬럼 추가**:
```tsx
'use client';

import Link from 'next/link';
import { Eye, Trash2 } from 'lucide-react';
import type { Writer } from '@/types/invoice';
import { SortableHeader } from '@/components/ui/SortableHeader';
// (NameCell/FeeRateCell/NullableRateCell/DateCell/ContractStatusCell/typeBadge 정의를 이 파일로 이동)

export function WriterTable({
  writers,
  isAdmin,
  sortKey,
  dir,
  toggle,
  onPatch,
  onDelete,
  focusId,
}: {
  writers: Writer[];
  isAdmin: boolean;
  sortKey: string | null;
  dir: 'asc' | 'desc';
  toggle: (key: string) => void;
  onPatch: (id: string, patch: Partial<Writer>) => Promise<void>;
  onDelete: (id: string) => void;
  focusId?: string | null;
}) {
  return (
    <div className="bg-card border border-border rounded-lg overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-primary/10 border-b border-border">
          <tr>
            <SortableHeader label="작가 코드" sortKey="writer_code" activeKey={sortKey} dir={dir} onToggle={toggle} />
            <SortableHeader label="작가명" sortKey="name" activeKey={sortKey} dir={dir} onToggle={toggle} />
            <SortableHeader label="영구 저작물(%)" sortKey="permanent_rate" activeKey={sortKey} dir={dir} onToggle={toggle} align="center" />
            <SortableHeader label="일반 저작물(%)" sortKey="general_rate" activeKey={sortKey} dir={dir} onToggle={toggle} align="center" />
            <SortableHeader label="용역 요율(%)" sortKey="fee_rate" activeKey={sortKey} dir={dir} onToggle={toggle} align="center" />
            <SortableHeader label="재계약일" sortKey="recontract_date" activeKey={sortKey} dir={dir} onToggle={toggle} align="center" />
            <th className="px-4 py-3 text-center font-bold text-foreground text-xs uppercase">상세정보</th>
            <SortableHeader label="계약 상태" sortKey="status" activeKey={sortKey} dir={dir} onToggle={toggle} align="center" />
            {isAdmin && <th className="px-4 py-3 text-center font-bold text-foreground text-xs uppercase">액션</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {writers.map((w) => (
            <tr key={w.id} data-focus-id={w.id} className={`hover:bg-primary/5 ${focusId === w.id ? 'bg-primary/10' : ''}`}>
              <td className="px-4 py-3 text-center text-muted-foreground font-mono tabular-nums">{w.writer_code}</td>
              <td className="px-4 py-3"><NameCell value={w.name} editable={isAdmin} onSave={(v) => onPatch(w.id, { name: v })} /></td>
              <td className="px-4 py-3 text-center"><NullableRateCell value={w.permanent_rate} editable={isAdmin} onSave={(v) => onPatch(w.id, { permanent_rate: v })} /></td>
              <td className="px-4 py-3 text-center"><NullableRateCell value={w.general_rate} editable={isAdmin} onSave={(v) => onPatch(w.id, { general_rate: v })} /></td>
              <td className="px-4 py-3 text-center"><FeeRateCell value={w.fee_rate} editable={isAdmin} onSave={(v) => onPatch(w.id, { fee_rate: v })} /></td>
              <td className="px-4 py-3 text-center"><DateCell value={w.recontract_date} editable={isAdmin} onSave={(v) => onPatch(w.id, { recontract_date: v })} /></td>
              <td className="px-4 py-3 text-center">
                <Link href={`/admin/writers/${w.id}`} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs border border-border rounded-lg text-foreground hover:bg-primary/10 hover:border-primary transition cursor-pointer">
                  <Eye className="w-3.5 h-3.5" /> 보기
                </Link>
              </td>
              <td className="px-4 py-3 text-center"><ContractStatusCell value={w.status} editable={isAdmin} onSave={(v) => onPatch(w.id, { status: v })} /></td>
              {isAdmin && (
                <td className="px-4 py-3 text-center">
                  <button onClick={() => onDelete(w.id)} title="삭제" className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-red-400 hover:bg-red-500/15 transition cursor-pointer">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```
> SortableHeader의 실제 import 경로·props(`align` 지원 여부)는 기존 `admin/writers/page.tsx`의 사용을 그대로 따를 것. 이동한 셀 컴포넌트(NameCell 등)는 기존 코드 그대로 붙여넣어 동작 보존.

- [ ] **Step 2: 페이지에서 onPatch/onDelete 핸들러 정리**

`admin/writers/page.tsx`에 단일 패치 헬퍼(기존 개별 저장 핸들러를 대체/통합):
```tsx
const handlePatch = useCallback(async (id: string, patch: Partial<Writer>) => {
  const res = await fetch(`/api/writers/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  });
  if (res.ok) {
    const updated = (await res.json()).writer as Writer;
    setWriters((prev) => prev.map((w) => (w.id === id ? updated : w)));
  } else {
    showToast((await res.json()).error || '저장 실패');
  }
}, []);
```
기존 삭제 핸들러는 `onDelete`로 전달.

- [ ] **Step 3: 탭별 섹션 렌더로 교체**

기존 단일 표 렌더 블록을 다음으로 교체. `전체` 탭은 전속·일반 2개 WriterTable, 개별 탭은 1개, 해지 탭은 해지 표:
```tsx
const activeWriters = useMemo(() => writers.filter((w) => w.status !== 'terminated'), [writers]);
const exclusive = useMemo(() => sortRows(activeWriters.filter((w) => w.writer_type === '전속작가')), [activeWriters, sortRows]);
const general = useMemo(() => sortRows(activeWriters.filter((w) => w.writer_type === '일반작가')), [activeWriters, sortRows]);
const terminated = useMemo(() => sortRows(writers.filter((w) => w.status === 'terminated')), [writers, sortRows]);

// JSX:
{selectedTab === TERMINATED_TAB ? (
  <Section title="계약 해지">
    <WriterTable writers={terminated} isAdmin={isAdmin} sortKey={sortKey} dir={dir} toggle={toggle} onPatch={handlePatch} onDelete={handleDelete} focusId={focusId} />
  </Section>
) : (
  <div className="space-y-8">
    {(selectedTab === '전체' || selectedTab === '전속작가') && (
      <Section title="전속작가">
        <WriterTable writers={exclusive} isAdmin={isAdmin} sortKey={sortKey} dir={dir} toggle={toggle} onPatch={handlePatch} onDelete={handleDelete} focusId={focusId} />
      </Section>
    )}
    {(selectedTab === '전체' || selectedTab === '일반작가') && (
      <Section title="일반작가">
        <WriterTable writers={general} isAdmin={isAdmin} sortKey={sortKey} dir={dir} toggle={toggle} onPatch={handlePatch} onDelete={handleDelete} focusId={focusId} />
      </Section>
    )}
  </div>
)}
```
`Section` 간단 래퍼(페이지 내 정의):
```tsx
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-sm font-bold text-foreground mb-2 px-1">{title}</h2>
      {children}
    </section>
  );
}
```
> `sortKey`/`dir`/`toggle`/`focusId`는 기존 `useTableSort`·`useRowFocus` 반환값을 그대로 전달. 정렬 설정 키에서 `writer_type`은 제거해도 무방(표에 구분 컬럼 없음).

- [ ] **Step 4: 기존 단일 표·구분 셀·미사용 코드 제거 확인**

`admin/writers/page.tsx`에서 표에 쓰이던 `WriterTypeSelect` 셀 사용처(구분 컬럼)와 이동된 셀 컴포넌트 정의가 중복으로 남지 않게 정리. `WriterTypeSelect`는 등록 폼에서만 유지.

- [ ] **Step 5: 타입 체크 + eslint + build**

Run: `npm run type-check && npx eslint "src/app/(dashboard)/admin/writers/page.tsx" src/components/writers/WriterTable.tsx && npm run build`
Expected: PASS, 0 error, build 성공.

- [ ] **Step 6: 화면 확인(Playwright, 인증 세션)**

`/admin/writers` 접속 → `전체` 탭에 전속작가/일반작가 2개 섹션 표 표시, 구분 컬럼 없음, 재계약일과 계약상태 사이 '상세정보(보기)' 컬럼 존재. `전속작가` 탭은 전속 표만, `일반작가` 탭은 일반 표만, `계약 해지` 탭은 해지 표만. 인라인 편집(요율·재계약일·상태) 정상 저장.

---

## Task 6: 작가 상세 페이지 `/admin/writers/[id]`

**Files:**
- Create: `src/app/(dashboard)/admin/writers/[id]/page.tsx`

**Interfaces:**
- Consumes: `GET /api/writers/[id]`(Task 3), `PATCH /api/writers/[id]`(기존), `PositionSelect`(Task 4), `formatPositions`(Task 2), Writer 타입.

- [ ] **Step 1: 상세 페이지 작성(마스터 + 신규 4필드 편집)**

`src/app/(dashboard)/admin/writers/[id]/page.tsx`:
```tsx
'use client';

// 작가 상세 — 마스터 정보 + 영문명·활동명·포지션·원작자 코드 편집(ADMIN).
// 변경 후 [저장]으로 PATCH /api/writers/[id] (generic 루프가 변경 필드만 반영).

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import type { Writer } from '@/types/invoice';
import { WRITER_TYPES } from '@/lib/ui/roleMeta'; // 없으면 ['전속작가','일반작가'] 로컬 상수 사용
import { PositionSelect } from '@/components/writers/PositionSelect';
import type { PositionCode } from '@/lib/writers/position';

export default function WriterDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [writer, setWriter] = useState<Writer | null>(null);
  const [form, setForm] = useState<Partial<Writer>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/writers/${id}`);
        if (!res.ok) throw new Error((await res.json()).error || '조회 실패');
        const w = (await res.json()).writer as Writer;
        setWriter(w);
        setForm(w);
      } catch (err) {
        setError(err instanceof Error ? err.message : '오류가 발생했습니다.');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const set = <K extends keyof Writer>(key: K, value: Writer[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const numOrNull = (s: string) => (s.trim() === '' ? null : Math.min(100, Math.max(0, Number(s) || 0)));

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const body = {
        name: form.name,
        writer_type: form.writer_type,
        fee_rate: form.fee_rate,
        permanent_rate: form.permanent_rate,
        general_rate: form.general_rate,
        recontract_date: form.recontract_date || null,
        status: form.status,
        english_name: form.english_name ?? null,
        stage_name: form.stage_name ?? null,
        position: form.position ?? [],
        original_writer_code: form.original_writer_code ?? null,
      };
      const res = await fetch(`/api/writers/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error((await res.json()).error || '저장 실패');
      const updated = (await res.json()).writer as Writer;
      setWriter(updated);
      setForm(updated);
      setToast('저장되었습니다');
      setTimeout(() => setToast(null), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : '저장 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-sm text-muted-foreground">로딩 중...</div>;
  }
  if (error && !writer) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-400 mb-4">오류: {error}</p>
        <Link href="/admin/writers" className="text-primary text-sm hover:underline">← 작가 마스터로</Link>
      </div>
    );
  }
  if (!writer) return null;

  const inputClass = 'w-full px-3 py-2 text-sm text-center bg-background border border-border rounded-lg outline-none focus:border-primary text-foreground';
  const labelClass = 'block text-xs font-semibold text-muted-foreground mb-1.5 text-center';

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/admin/writers" className="inline-flex items-center gap-1.5 px-3 py-2 text-xs border border-border rounded-lg text-foreground hover:bg-muted transition cursor-pointer">
            <ArrowLeft className="w-3.5 h-3.5" /> 목록
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{writer.name}</h1>
            <p className="text-sm text-muted-foreground font-mono">{writer.writer_code}</p>
          </div>
        </div>
        <button onClick={handleSave} disabled={saving} className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition font-medium cursor-pointer disabled:opacity-50">
          {saving ? '저장 중...' : '저장'}
        </button>
      </div>

      {error && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">{error}</p>}

      {/* 기본 정보 */}
      <section className="bg-card border border-border rounded-lg p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div>
          <label className={labelClass}>작가명</label>
          <input className={inputClass} value={form.name ?? ''} onChange={(e) => set('name', e.target.value)} />
        </div>
        <div>
          <label className={labelClass}>구분</label>
          <select className={inputClass} value={form.writer_type ?? ''} onChange={(e) => set('writer_type', e.target.value)}>
            {['전속작가', '일반작가'].map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className={labelClass}>계약 상태</label>
          <select className={inputClass} value={form.status ?? 'active'} onChange={(e) => set('status', e.target.value)}>
            <option value="active">활성화</option>
            <option value="terminated">계약 해지</option>
          </select>
        </div>
        <div>
          <label className={labelClass}>영구 저작물(%)</label>
          <input className={inputClass} type="number" min={0} max={100} value={form.permanent_rate ?? ''} placeholder="미지정" onChange={(e) => set('permanent_rate', numOrNull(e.target.value))} />
        </div>
        <div>
          <label className={labelClass}>일반 저작물(%)</label>
          <input className={inputClass} type="number" min={0} max={100} value={form.general_rate ?? ''} placeholder="미지정" onChange={(e) => set('general_rate', numOrNull(e.target.value))} />
        </div>
        <div>
          <label className={labelClass}>용역 요율(%)</label>
          <input className={inputClass} type="number" min={0} max={100} value={form.fee_rate ?? 0} onChange={(e) => set('fee_rate', Math.min(100, Math.max(0, Number(e.target.value) || 0)))} />
        </div>
        <div>
          <label className={labelClass}>재계약일</label>
          <input className={inputClass} type="date" value={form.recontract_date ?? ''} onChange={(e) => set('recontract_date', e.target.value || null)} />
        </div>
      </section>

      {/* 상세 정보(신규) */}
      <section className="bg-card border border-border rounded-lg p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>영문명</label>
          <input className={inputClass} value={form.english_name ?? ''} onChange={(e) => set('english_name', e.target.value || null)} />
        </div>
        <div>
          <label className={labelClass}>활동명</label>
          <input className={inputClass} value={form.stage_name ?? ''} onChange={(e) => set('stage_name', e.target.value || null)} />
        </div>
        <div>
          <label className={labelClass}>원작자 코드</label>
          <input className={inputClass} value={form.original_writer_code ?? ''} placeholder="실제 저작물 작가코드" onChange={(e) => set('original_writer_code', e.target.value || null)} />
        </div>
        <div>
          <label className={labelClass}>포지션</label>
          <div className="flex justify-center">
            <PositionSelect value={form.position ?? []} onChange={(next: PositionCode[]) => set('position', next)} />
          </div>
        </div>
      </section>

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-foreground text-background text-sm px-4 py-2 rounded-full shadow-lg z-[210] pointer-events-none">{toast}</div>
      )}
    </div>
  );
}
```
> `WRITER_TYPES`가 `@/lib/ui/roleMeta`에 export돼 있지 않으면 위처럼 인라인 `['전속작가','일반작가']`를 사용(코드대로 작성됨). 구분 변경 시 writer_code 재배정은 기존 PATCH가 처리.

- [ ] **Step 2: 타입 체크 + eslint**

Run: `npm run type-check && npx eslint "src/app/(dashboard)/admin/writers/[id]/page.tsx"`
Expected: PASS, 0 error

- [ ] **Step 3: 빌드**

Run: `npm run build`
Expected: build 성공, 라우트 목록에 `/admin/writers/[id]` 표시.

- [ ] **Step 4: 화면 확인(Playwright, 인증 세션)**

`/admin/writers`에서 임의 작가 '보기' → 상세 페이지 이동. 영문명·활동명·원작자 코드 입력, 포지션 드롭다운에서 작사+작곡 다중 선택(트리거에 '작사 · 작곡' 표시), 구분/상태/요율 변경 후 [저장] → 새로고침해도 값 유지. 목록으로 돌아가 변경(구분 변경 시 섹션 이동) 반영 확인.

---

## Self-Review

**1. Spec coverage**

| 스펙 요구 | 구현 위치 |
|---|---|
| 전속/일반 섹션 표 분리 | Task 5 Step 3 (전체 탭 2섹션) |
| 구분 컬럼 제거 | Task 5 Step 1 (헤더에서 제외) |
| 등록 시 구분→해당 섹션 배정 | Task 5 (writer_type 필터로 자동) — 등록 폼 그대로 |
| 재계약일·계약상태 사이 상세정보 컬럼 + 보기 버튼 | Task 5 Step 1 ('상세정보' th + Link) |
| 보기 클릭→작가 상세 페이지 | Task 5 Step 1 `Link /admin/writers/[id]` + Task 6 |
| 상세: 마스터 정보 표시·편집 | Task 6 (기본 정보 섹션, Q3=편집) |
| 영문명·활동명·원작자 코드 | Task 1·3·6 |
| 포지션 A/C/AR 드롭다운, 초기 (미정), 다중 | Task 2·4·6 (TEXT[], formatPositions '(미정)') |

모든 요구에 대응 태스크 존재. 누락 없음.

**2. Placeholder scan:** 모든 코드 스텝에 실제 코드 포함. "적절히 처리" 류 없음. 마이그레이션 적용은 명시적 수동 단계(Task 1 Step 2).

**3. Type consistency:** `formatPositions(positions: string[])`, `PositionSelect.onChange: (next: PositionCode[])`, `WriterTable.onPatch: (id, Partial<Writer>)`, Writer.position: `string[]` — 전 태스크 시그니처 일치. WRITER_SELECT 문자열은 route.ts·[id]/route.ts 동일 갱신(Task 3 Step 2·4).

**잠재 리스크 메모:** ① `SortableHeader`의 `align` prop·import 경로는 기존 페이지 사용을 그대로 따를 것(Task 5 주석). ② `DropdownMenuCheckboxItem` 부재 시 base-ui 래퍼 추가(Task 4 Step 2). ③ 인라인 셀 이동 시 기존 동작 보존(복붙) — 신규 작성 금지.

---

## Execution Handoff

계획서를 `docs/superpowers/plans/2026-06-26-writer-master-sections-and-detail.md`에 저장했습니다.
