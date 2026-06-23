# 거래처 상세정보 페이지 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 거래처 DB 목록의 행을 클릭하면 `/admin/clients/[id]` 전용 페이지로 이동해, 탭(기본정보·담당정보·은행정보·프로젝트)으로 상세 정보를 보고 인라인 수정하며 연결된 청구서 이력을 확인할 수 있게 한다.

**Architecture:** `clients` 테이블에 상세 컬럼 10개(모두 nullable)를 추가하고, 단일 거래처 조회 API(`GET /api/clients/[id]`)와 전 필드 수정 API(`PATCH` 확장)를 만든다. 전용 라우트 페이지가 탭 UI를 구성하며, 기본/담당/은행 탭은 재사용 가능한 `EditableField`로 ADMIN 인라인 편집을 제공하고, 프로젝트 탭은 기존 `GET /api/invoices?client_id=` 를 재사용해 청구서 이력을 읽기전용으로 보여준다.

**Tech Stack:** Next.js 16 App Router(동적 라우트, `useParams`), React 19, TypeScript strict, Tailwind v4, Supabase(PostgreSQL), zod v4.

## Global Constraints

- `any` 타입 금지, TypeScript strict 모드 — 모든 타입 명시.
- 들여쓰기 2칸. 컴포넌트 PascalCase, 변수/함수 camelCase, 상수 UPPER_SNAKE_CASE.
- 주석은 한국어, 자명한 코드엔 생략.
- **텍스트 정렬:** 모든 편집 input은 `text-center`. 프로젝트 목록 표 헤더·셀은 `text-center`(거래처 DB 표와 동일). 라벨-값 카드는 라벨 `text-center text-xs text-muted-foreground`, 값/입력칸 `text-center`.
- 반응형 필수: 탭 콘텐츠 그리드는 `grid-cols-1 sm:grid-cols-2`.
- 권한: 조회는 ADMIN/STAFF(`requireStaff()`), 수정은 ADMIN(`requireStaff(true)`). 클라이언트는 `useAuthStore().user?.role === 'ADMIN'`로 편집 UI 노출 제어.
- 신규 컬럼은 전부 nullable → 기존 거래처는 값이 없으면 `미입력`(muted)으로 표시.
- 커밋/푸시/머지는 **사용자가 명시적으로 지시할 때만**(자동 금지).

---

## File Structure

| 파일 | 책임 |
|------|------|
| `supabase/migrations/021_client_details.sql` (신규) | clients 상세 컬럼 10개 추가(nullable) |
| `src/types/invoice.ts` (수정) | `Client` 인터페이스에 상세 필드 10개 추가 |
| `src/lib/validation/schemas.ts` (수정) | `clientUpdateSchema`에 상세 필드 검증 추가 |
| `src/app/api/clients/[id]/route.ts` (수정) | `GET` 단일 조회 신규 + `PATCH` 전 필드 반영 |
| `src/components/clients/EditableField.tsx` (신규) | 라벨+값 인라인 편집 셀(ADMIN), 단일 필드 PATCH |
| `src/components/clients/ClientProjectsTab.tsx` (신규) | 거래처 연결 청구서(프로젝트) 목록 표(읽기전용) |
| `src/app/(dashboard)/admin/clients/[id]/page.tsx` (신규) | 상세 페이지 — 데이터 fetch + 탭 4개 조합 |
| `src/app/(dashboard)/admin/clients/page.tsx` (수정) | 행 클릭→상세 이동, 거래처명 인라인편집 제거 |

---

## Task 1: 마이그레이션 — clients 상세 컬럼 추가

**Files:**
- Create: `supabase/migrations/021_client_details.sql`

**Interfaces:**
- Produces: clients 테이블에 컬럼 `representative, business_number, address, manager_name, contact_phone, contact_email, department_title, bank_name, account_number, account_holder` (전부 `TEXT`, nullable).

- [ ] **Step 1: 마이그레이션 파일 작성**

`supabase/migrations/021_client_details.sql`:

```sql
-- ============================================================================
-- 거래처 DB: 상세정보 컬럼 추가 (021_client_details.sql)
-- 상세 페이지(기본/담당/은행 섹션)용 필드. 전부 nullable → 기존 거래처는 미입력 상태.
-- 참조 패턴: 020_client_code.sql.
-- ============================================================================

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS representative   TEXT,  -- 대표자
  ADD COLUMN IF NOT EXISTS business_number  TEXT,  -- 사업자 등록번호
  ADD COLUMN IF NOT EXISTS address          TEXT,  -- 주소
  ADD COLUMN IF NOT EXISTS manager_name     TEXT,  -- 담당자
  ADD COLUMN IF NOT EXISTS contact_phone    TEXT,  -- 연락처
  ADD COLUMN IF NOT EXISTS contact_email    TEXT,  -- 이메일
  ADD COLUMN IF NOT EXISTS department_title TEXT,  -- 부서 / 직함
  ADD COLUMN IF NOT EXISTS bank_name        TEXT,  -- 은행명
  ADD COLUMN IF NOT EXISTS account_number   TEXT,  -- 계좌번호
  ADD COLUMN IF NOT EXISTS account_holder   TEXT;  -- 예금주

COMMENT ON COLUMN public.clients.representative   IS '대표자';
COMMENT ON COLUMN public.clients.business_number  IS '사업자 등록번호';
COMMENT ON COLUMN public.clients.address          IS '주소';
COMMENT ON COLUMN public.clients.manager_name     IS '담당자';
COMMENT ON COLUMN public.clients.contact_phone    IS '연락처';
COMMENT ON COLUMN public.clients.contact_email    IS '이메일';
COMMENT ON COLUMN public.clients.department_title IS '부서 / 직함';
COMMENT ON COLUMN public.clients.bank_name        IS '은행명';
COMMENT ON COLUMN public.clients.account_number   IS '계좌번호';
COMMENT ON COLUMN public.clients.account_holder   IS '예금주';
```

- [ ] **Step 2: 마이그레이션 적용**

Run: `npx supabase db push`
Expected: `Applying migration 021_client_details.sql...` 후 성공(No errors). 이미 적용된 020까지는 건너뛴다.

- [ ] **Step 3: 적용 확인**

Run: `npx supabase db push --dry-run`
Expected: `Remote database is up to date.` (적용할 새 마이그레이션 없음)

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/021_client_details.sql
git commit -m "Feat: 거래처 상세 컬럼 추가 마이그레이션(021)"
```

---

## Task 2: 타입 · 검증 확장

**Files:**
- Modify: `src/types/invoice.ts` (`Client` 인터페이스)
- Modify: `src/lib/validation/schemas.ts` (`clientUpdateSchema`)

**Interfaces:**
- Consumes: Task 1의 컬럼.
- Produces: `Client`에 상세 필드(`string | null` optional) 10개. `clientUpdateSchema`가 동일 키들을 `z.string().trim().nullable().optional()`로 허용.

- [ ] **Step 1: `Client` 인터페이스 확장**

`src/types/invoice.ts` — 기존 `Client`(라인 56~63)를 아래로 교체:

```ts
// 거래처
export interface Client {
  id: string;
  client_code?: string; // 거래처 고유 코드 CL-001 (거래처 DB에만 노출). 조인 결과엔 없을 수 있어 optional
  name: string;
  is_active: boolean;
  created_at?: string; // 거래처 DB 관리 페이지용(테이블에 존재). 조인 결과엔 없을 수 있어 optional
  // 상세정보(021) — 전부 nullable. 조인 결과엔 없을 수 있어 optional.
  representative?: string | null;   // 대표자
  business_number?: string | null;  // 사업자 등록번호
  address?: string | null;          // 주소
  manager_name?: string | null;     // 담당자
  contact_phone?: string | null;    // 연락처
  contact_email?: string | null;    // 이메일
  department_title?: string | null; // 부서 / 직함
  bank_name?: string | null;        // 은행명
  account_number?: string | null;   // 계좌번호
  account_holder?: string | null;   // 예금주
}
```

- [ ] **Step 2: `clientUpdateSchema` 확장**

`src/lib/validation/schemas.ts` — 기존 `clientUpdateSchema`(라인 137~140)를 아래로 교체:

```ts
export const clientUpdateSchema = z.object({
  name: z.string().trim().min(1, '거래처명은 필수입니다.').optional(),
  is_active: z.boolean().optional(),
  // 상세정보(021) — 빈 문자열/누락은 null로 클리어 허용
  representative: z.string().trim().nullable().optional(),
  business_number: z.string().trim().nullable().optional(),
  address: z.string().trim().nullable().optional(),
  manager_name: z.string().trim().nullable().optional(),
  contact_phone: z.string().trim().nullable().optional(),
  contact_email: z.string().trim().nullable().optional(),
  department_title: z.string().trim().nullable().optional(),
  bank_name: z.string().trim().nullable().optional(),
  account_number: z.string().trim().nullable().optional(),
  account_holder: z.string().trim().nullable().optional(),
});
```

- [ ] **Step 3: 타입 체크**

Run: `npm run type-check`
Expected: PASS (0 error)

- [ ] **Step 4: Commit**

```bash
git add src/types/invoice.ts src/lib/validation/schemas.ts
git commit -m "Feat: 거래처 상세 필드 타입·검증 스키마 확장"
```

---

## Task 3: API — 단일 조회 + 전 필드 수정

**Files:**
- Modify: `src/app/api/clients/[id]/route.ts`

**Interfaces:**
- Consumes: Task 2의 `clientUpdateSchema`.
- Produces:
  - `GET /api/clients/[id]` → `{ client: Client }` (전체 컬럼, 404 시 `{ error }`). 권한 STAFF 이상.
  - `PATCH /api/clients/[id]` → `{ client: Client }` (상세 필드 포함 반영). 권한 ADMIN.

- [ ] **Step 1: GET 핸들러 추가 + PATCH 필드 매핑 확장**

`src/app/api/clients/[id]/route.ts` 전체를 아래로 교체:

```ts
// 거래처 단일 조회(STAFF↑) / 수정(ADMIN) / 삭제(ADMIN)

import { NextRequest, NextResponse } from 'next/server';
import { requireStaff, isErrorResponse } from '@/lib/auth/apiAuth';
import { parseBody } from '@/lib/validation/parse';
import { clientUpdateSchema } from '@/lib/validation/schemas';

// PATCH로 갱신 가능한 컬럼 화이트리스트(스키마와 1:1). 전송된 값만 부분 갱신.
const PATCHABLE_FIELDS = [
  'name',
  'is_active',
  'representative',
  'business_number',
  'address',
  'manager_name',
  'contact_phone',
  'contact_email',
  'department_title',
  'bank_name',
  'account_number',
  'account_holder',
] as const;

// GET /api/clients/[id] — 단일 거래처 전체 필드 (상세 페이지용)
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireStaff();
    if (isErrorResponse(auth)) return auth;

    const { id } = await params;
    const { data, error } = await auth.adminClient
      .from('clients')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      // PGRST116 = 결과 없음
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: '거래처를 찾을 수 없습니다.' }, { status: 404 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ client: data });
  } catch (err) {
    console.error('거래처 단일 조회 API 오류:', err);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireStaff(true);
    if (isErrorResponse(auth)) return auth;

    const { id } = await params;
    const parsed = parseBody(clientUpdateSchema, await req.json());
    if (!parsed.success) return parsed.response;

    // 전송된 필드만 부분 갱신 (undefined 제외, null은 클리어 의미로 반영)
    const data = parsed.data as Record<string, unknown>;
    const updates: Record<string, unknown> = {};
    for (const field of PATCHABLE_FIELDS) {
      if (data[field] !== undefined) updates[field] = data[field];
    }
    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: '변경할 내용이 없습니다.' }, { status: 400 });
    }

    const { data: updated, error } = await auth.adminClient
      .from('clients')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: '이미 존재하는 거래처명입니다.' }, { status: 409 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ client: updated });
  } catch (err) {
    console.error('거래처 수정 API 오류:', err);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

// DELETE /api/clients/[id] — 영구 삭제 (ADMIN only)
// 거래처는 청구서(invoices.client_id)가 FK로 참조 → 사용 중이면 DB가 막음(23503).
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireStaff(true);
    if (isErrorResponse(auth)) return auth;

    const { id } = await params;
    const { error } = await auth.adminClient.from('clients').delete().eq('id', id);

    if (error) {
      if (error.code === '23503') {
        return NextResponse.json(
          { error: '청구서에서 사용 중인 거래처는 삭제할 수 없습니다. 미사용으로 전환하세요.' },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('거래처 삭제 API 오류:', err);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
```

> 참고: 기존 PATCH는 `name`/`is_active`만 명시 매핑했는데, 화이트리스트 루프로 바꿔 상세 필드까지 DRY하게 반영한다. DELETE는 기존 동작 그대로 유지.

- [ ] **Step 2: 타입 체크 + 린트**

Run: `npm run type-check && npx eslint src/app/api/clients/[id]/route.ts`
Expected: PASS (0 error)

- [ ] **Step 3: Commit**

```bash
git add "src/app/api/clients/[id]/route.ts"
git commit -m "Feat: 거래처 단일 조회 API + 상세 필드 수정 반영"
```

---

## Task 4: EditableField — 인라인 편집 셀

**Files:**
- Create: `src/components/clients/EditableField.tsx`

**Interfaces:**
- Produces: `EditableField` 컴포넌트.
  ```ts
  interface EditableFieldProps {
    clientId: string;        // PATCH 대상 거래처 id
    field: string;           // 갱신할 컬럼명 (예: 'representative')
    label: string;           // 표시 라벨
    value: string | null;    // 현재 값
    editable: boolean;       // ADMIN 여부
    onSaved: (field: string, value: string | null) => void; // 저장 성공 시 부모 상태 갱신
  }
  ```
  - 클릭 → input(`text-center`) 편집, Enter/blur 저장, Escape 취소. 빈 값 저장 시 `null`(미입력)로 클리어.
  - 비편집/빈 값은 `미입력`(muted) 표시. `editable=false`면 클릭 불가.

- [ ] **Step 1: 컴포넌트 작성**

`src/components/clients/EditableField.tsx`:

```tsx
'use client';

// 거래처 상세 — 라벨+값 인라인 편집 카드. ADMIN만 편집 가능, 단일 필드 PATCH.
// 텍스트 정렬: 라벨·값·입력칸 모두 가운데. 빈 값 저장 시 null(미입력)로 클리어.

import { useState, useCallback } from 'react';

interface EditableFieldProps {
  clientId: string;
  field: string;
  label: string;
  value: string | null;
  editable: boolean;
  onSaved: (field: string, value: string | null) => void;
}

export function EditableField({
  clientId,
  field,
  label,
  value,
  editable,
  onSaved,
}: EditableFieldProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? '');
  const [saving, setSaving] = useState(false);

  const handleSave = useCallback(async () => {
    const trimmed = draft.trim();
    const next = trimmed === '' ? null : trimmed;
    if (next === (value ?? null)) {
      setIsEditing(false);
      setDraft(value ?? '');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/clients/${clientId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: next }),
      });
      if (res.ok) {
        onSaved(field, next);
        setIsEditing(false);
      } else {
        // 실패 시 원복
        setDraft(value ?? '');
      }
    } finally {
      setSaving(false);
    }
  }, [clientId, field, draft, value, onSaved]);

  return (
    <div className="rounded-lg border border-border bg-card px-4 py-3 flex flex-col items-center gap-1.5">
      <span className="text-xs text-muted-foreground text-center">{label}</span>
      {isEditing ? (
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSave();
            if (e.key === 'Escape') { setDraft(value ?? ''); setIsEditing(false); }
          }}
          onBlur={handleSave}
          autoFocus
          disabled={saving}
          className="w-full px-2 py-1 text-sm text-center bg-background border border-primary rounded outline-none text-foreground"
        />
      ) : editable ? (
        <button
          type="button"
          onClick={() => { setDraft(value ?? ''); setIsEditing(true); }}
          className="w-full px-2 py-1 text-sm text-center text-foreground rounded hover:bg-primary/10 transition cursor-pointer"
          title="클릭하여 수정"
        >
          {value ? value : <span className="text-muted-foreground">미입력</span>}
        </button>
      ) : (
        <span className="text-sm text-center text-foreground">
          {value ? value : <span className="text-muted-foreground">미입력</span>}
        </span>
      )}
    </div>
  );
}
```

- [ ] **Step 2: 타입 체크 + 린트**

Run: `npm run type-check && npx eslint src/components/clients/EditableField.tsx`
Expected: PASS (0 error)

- [ ] **Step 3: Commit**

```bash
git add src/components/clients/EditableField.tsx
git commit -m "Feat: 거래처 상세 인라인 편집 필드 컴포넌트"
```

---

## Task 5: ClientProjectsTab — 프로젝트(청구서) 목록

**Files:**
- Create: `src/components/clients/ClientProjectsTab.tsx`

**Interfaces:**
- Consumes: `GET /api/invoices?client_id=${clientId}` → `{ invoices: Invoice[] }` (각 invoice는 `items` 포함). `calcInvoiceTotals`(calculator.ts), `STATUS_LABEL`/`STATUS_STYLE`(InvoiceStatusSelect.tsx).
- Produces: `ClientProjectsTab` 컴포넌트.
  ```ts
  interface ClientProjectsTabProps { clientId: string; }
  ```
  - 마운트 시 청구서 fetch. 거래명(title)·일자·상태·공급가합(순매출)을 표로 표시(읽기전용). 빈 목록/로딩/에러 상태 처리.

- [ ] **Step 1: 컴포넌트 작성**

`src/components/clients/ClientProjectsTab.tsx`:

```tsx
'use client';

// 거래처 상세 — 프로젝트 탭. 해당 거래처와 진행한 청구서(거래) 이력을 읽기전용 표로.
// 합계는 청구서 계산 로직(calcInvoiceTotals) 재사용, 상태 라벨/색은 InvoiceStatusSelect 재사용.

import { useEffect, useState, useCallback } from 'react';
import type { Invoice } from '@/types/invoice';
import { calcInvoiceTotals } from '@/lib/invoice/calculator';
import { STATUS_LABEL, STATUS_STYLE } from '@/components/invoice/InvoiceStatusSelect';

interface ClientProjectsTabProps {
  clientId: string;
}

export function ClientProjectsTab({ clientId }: ClientProjectsTabProps) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInvoices = useCallback(async () => {
    try {
      const res = await fetch(`/api/invoices?client_id=${clientId}`);
      if (!res.ok) throw new Error('프로젝트 내역을 불러올 수 없습니다.');
      setInvoices((await res.json()).invoices || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [clientId]);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- async fetch (마이크로태스크에서 setState)
  useEffect(() => { fetchInvoices(); }, [fetchInvoices]);

  if (isLoading) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin rounded-full h-6 w-6 border-2 border-border border-t-primary mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">프로젝트 내역 로딩 중...</p>
      </div>
    );
  }
  if (error) {
    return <div className="p-8 text-center"><p className="text-red-400 text-sm">오류: {error}</p></div>;
  }
  if (invoices.length === 0) {
    return <div className="p-8 text-center"><p className="text-muted-foreground text-sm">진행한 프로젝트(청구서)가 없습니다.</p></div>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead className="bg-primary/10 border-b border-border">
          <tr>
            <th className="px-4 py-3 text-center font-bold text-foreground text-xs uppercase">거래명</th>
            <th className="px-4 py-3 text-center font-bold text-foreground text-xs uppercase">일자</th>
            <th className="px-4 py-3 text-center font-bold text-foreground text-xs uppercase">상태</th>
            <th className="px-4 py-3 text-center font-bold text-foreground text-xs uppercase">공급가액</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {invoices.map((inv) => {
            const totals = calcInvoiceTotals(inv.items ?? []);
            return (
              <tr key={inv.id} className="hover:bg-primary/5">
                <td className="px-4 py-3 text-center text-foreground">{inv.title || '-'}</td>
                <td className="px-4 py-3 text-center text-muted-foreground text-xs">
                  {new Date(inv.invoice_date).toLocaleDateString('ko-KR')}
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${STATUS_STYLE[inv.status]}`}>
                    {STATUS_LABEL[inv.status]}
                  </span>
                </td>
                <td className="px-4 py-3 text-center tabular-nums text-foreground">
                  {totals.supplyTotal.toLocaleString('ko-KR')}원
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 2: 타입 체크 + 린트**

Run: `npm run type-check && npx eslint src/components/clients/ClientProjectsTab.tsx`
Expected: PASS (0 error)

- [ ] **Step 3: Commit**

```bash
git add src/components/clients/ClientProjectsTab.tsx
git commit -m "Feat: 거래처 상세 프로젝트(청구서 이력) 탭 컴포넌트"
```

---

## Task 6: 거래처 상세 페이지 — 탭 4개 조합

**Files:**
- Create: `src/app/(dashboard)/admin/clients/[id]/page.tsx`

**Interfaces:**
- Consumes: `GET /api/clients/[id]`, Task 4 `EditableField`, Task 5 `ClientProjectsTab`, `useAuthStore`, `useParams`/`useRouter`(next/navigation).
- Produces: `/admin/clients/[id]` 라우트. 탭 4개(`basic`·`manager`·`bank`·`projects`), 기본/담당/은행 탭은 `EditableField` 그리드, 프로젝트 탭은 `ClientProjectsTab`. 상단에 뒤로가기 + 거래처 코드·명 헤더.

- [ ] **Step 1: 페이지 작성**

`src/app/(dashboard)/admin/clients/[id]/page.tsx`:

```tsx
'use client';

// 거래처 상세 페이지 — 탭(기본정보·담당정보·은행정보·프로젝트).
// 조회: ADMIN/STAFF · 수정: ADMIN only(EditableField 내부에서 editable로 제어).

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import type { Client } from '@/types/invoice';
import { EditableField } from '@/components/clients/EditableField';
import { ClientProjectsTab } from '@/components/clients/ClientProjectsTab';

type TabKey = 'basic' | 'manager' | 'bank' | 'projects';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'basic', label: '기본정보' },
  { key: 'manager', label: '담당정보' },
  { key: 'bank', label: '은행정보' },
  { key: 'projects', label: '프로젝트' },
];

export default function ClientDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const clientId = params.id;
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN';

  const [client, setClient] = useState<Client | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<TabKey>('basic');

  const fetchClient = useCallback(async () => {
    try {
      const res = await fetch(`/api/clients/${clientId}`);
      if (!res.ok) throw new Error((await res.json()).error || '거래처를 불러올 수 없습니다.');
      setClient((await res.json()).client);
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [clientId]);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- async fetch (마이크로태스크에서 setState)
  useEffect(() => { fetchClient(); }, [fetchClient]);

  // 단일 필드 저장 성공 시 로컬 상태 갱신
  const handleSaved = useCallback((field: string, value: string | null) => {
    setClient((prev) => (prev ? { ...prev, [field]: value } : prev));
  }, []);

  if (isLoading) {
    return (
      <div className="p-12 text-center">
        <div className="animate-spin rounded-full h-6 w-6 border-2 border-border border-t-primary mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">데이터 로딩 중...</p>
      </div>
    );
  }
  if (error || !client) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => router.push('/admin/clients')}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" /> 거래처 DB
        </button>
        <div className="p-8 text-center"><p className="text-red-400">오류: {error ?? '거래처를 찾을 수 없습니다.'}</p></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* 헤더: 뒤로가기 + 코드·거래처명 */}
      <div className="space-y-3">
        <button
          onClick={() => router.push('/admin/clients')}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" /> 거래처 DB
        </button>
        <div className="flex items-center justify-center gap-3">
          <span className="font-mono text-sm tabular-nums text-muted-foreground">{client.client_code}</span>
          <h1 className="text-2xl font-bold text-foreground">{client.name}</h1>
        </div>
      </div>

      {/* 탭 버튼 (가운데 정렬) */}
      <div className="flex items-center justify-center gap-1 border-b border-border">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium transition cursor-pointer border-b-2 -mb-px ${
              tab === t.key
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* 탭 콘텐츠 */}
      {tab === 'basic' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* 거래처 코드 — 읽기전용 */}
          <div className="rounded-lg border border-border bg-card px-4 py-3 flex flex-col items-center gap-1.5">
            <span className="text-xs text-muted-foreground text-center">거래처 코드</span>
            <span className="text-sm text-center font-mono tabular-nums text-foreground">{client.client_code}</span>
          </div>
          <EditableField clientId={clientId} field="name" label="거래처명" value={client.name} editable={isAdmin} onSaved={handleSaved} />
          <EditableField clientId={clientId} field="representative" label="대표자" value={client.representative ?? null} editable={isAdmin} onSaved={handleSaved} />
          <EditableField clientId={clientId} field="business_number" label="사업자 등록번호" value={client.business_number ?? null} editable={isAdmin} onSaved={handleSaved} />
          <EditableField clientId={clientId} field="address" label="주소" value={client.address ?? null} editable={isAdmin} onSaved={handleSaved} />
          {/* 등록일 — 읽기전용 */}
          <div className="rounded-lg border border-border bg-card px-4 py-3 flex flex-col items-center gap-1.5">
            <span className="text-xs text-muted-foreground text-center">등록일</span>
            <span className="text-sm text-center text-foreground">
              {client.created_at ? new Date(client.created_at).toLocaleDateString('ko-KR') : '-'}
            </span>
          </div>
        </div>
      )}

      {tab === 'manager' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <EditableField clientId={clientId} field="manager_name" label="담당자" value={client.manager_name ?? null} editable={isAdmin} onSaved={handleSaved} />
          <EditableField clientId={clientId} field="contact_phone" label="연락처" value={client.contact_phone ?? null} editable={isAdmin} onSaved={handleSaved} />
          <EditableField clientId={clientId} field="contact_email" label="이메일" value={client.contact_email ?? null} editable={isAdmin} onSaved={handleSaved} />
          <EditableField clientId={clientId} field="department_title" label="부서 / 직함" value={client.department_title ?? null} editable={isAdmin} onSaved={handleSaved} />
        </div>
      )}

      {tab === 'bank' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <EditableField clientId={clientId} field="bank_name" label="은행명" value={client.bank_name ?? null} editable={isAdmin} onSaved={handleSaved} />
          <EditableField clientId={clientId} field="account_number" label="계좌번호" value={client.account_number ?? null} editable={isAdmin} onSaved={handleSaved} />
          <EditableField clientId={clientId} field="account_holder" label="예금주" value={client.account_holder ?? null} editable={isAdmin} onSaved={handleSaved} />
        </div>
      )}

      {tab === 'projects' && <ClientProjectsTab clientId={clientId} />}
    </div>
  );
}
```

- [ ] **Step 2: 타입 체크 + 린트**

Run: `npm run type-check && npx eslint "src/app/(dashboard)/admin/clients/[id]/page.tsx"`
Expected: PASS (0 error)

- [ ] **Step 3: Commit**

```bash
git add "src/app/(dashboard)/admin/clients/[id]/page.tsx"
git commit -m "Feat: 거래처 상세 페이지(탭 4개) 구현"
```

---

## Task 7: 거래처 목록 — 행 클릭으로 상세 이동

**Files:**
- Modify: `src/app/(dashboard)/admin/clients/page.tsx`

**Interfaces:**
- Consumes: Task 6의 라우트 `/admin/clients/[id]`.
- Produces: 목록 행 클릭 시 상세 페이지 이동. 거래처명 셀의 인라인 편집(연필)은 제거(편집은 상세 페이지로 일원화). 삭제 액션은 행 클릭과 분리(`stopPropagation`).

- [ ] **Step 1: `useRouter` import 추가, `ClientNameCell`·`handleNameSaved` 제거**

`src/app/(dashboard)/admin/clients/page.tsx` 상단 import 블록(라인 6~12)을 아래로 교체:

```tsx
import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import type { Client } from '@/types/invoice';
import { useTableSort } from '@/hooks/useTableSort';
import { useRowFocus } from '@/hooks/useRowFocus';
import { SortableHeader } from '@/components/ui/SortableHeader';
import { nextClientCode } from '@/lib/clients/clientCode';
```

그리고 `ClientNameCell` 컴포넌트 정의 전체(라인 14~80)를 **삭제**한다.

- [ ] **Step 2: `useRouter` 사용 + `handleNameSaved` 제거**

컴포넌트 본문에서 `const { user } = useAuthStore();` 바로 아래에 추가:

```tsx
  const router = useRouter();
```

그리고 `handleNameSaved` 정의(아래 코드)를 **삭제**:

```tsx
  const handleNameSaved = useCallback((id: string, name: string) => {
    setClients((prev) => prev.map((c) => (c.id === id ? { ...c, name } : c)));
  }, []);
```

> `useCallback`은 다른 곳(`fetchClients`, `deleteClient` 등)에서 계속 쓰이므로 import는 유지한다.

- [ ] **Step 3: 행을 클릭 가능하게 + 거래처명 셀 단순화 + 액션 분리**

tbody의 `sorted.map(...)` 행 블록(기존 라인 236~278)을 아래로 교체:

```tsx
                {sorted.map((c) => (
                  <tr
                    key={c.id}
                    id={`row-${c.id}`}
                    onClick={() => router.push(`/admin/clients/${c.id}`)}
                    className="hover:bg-primary/5 cursor-pointer"
                  >
                    <td className="px-6 py-3 text-center">
                      <span className="font-mono text-xs tabular-nums text-foreground">{c.client_code}</span>
                    </td>
                    <td className="px-6 py-3 text-center text-foreground">{c.name}</td>
                    <td className="px-6 py-3 text-center text-muted-foreground text-xs">
                      {c.created_at ? new Date(c.created_at).toLocaleDateString('ko-KR') : '-'}
                    </td>
                    {isAdmin && (
                      <td className="px-6 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                        {confirmingId === c.id ? (
                          <div className="flex items-center justify-center gap-1 whitespace-nowrap">
                            <button
                              onClick={() => deleteClient(c.id)}
                              className="px-2 py-1 rounded text-[11px] font-medium bg-red-500/20 text-red-400 hover:bg-red-500/30 transition cursor-pointer whitespace-nowrap"
                            >
                              삭제
                            </button>
                            <button
                              onClick={() => setConfirmingId(null)}
                              className="px-2 py-1 rounded text-[11px] font-medium bg-gray-500/20 text-gray-400 hover:bg-gray-500/30 transition cursor-pointer whitespace-nowrap"
                            >
                              취소
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmingId(c.id)}
                            className="p-1.5 text-muted-foreground hover:text-red-400 transition rounded hover:bg-red-500/10 cursor-pointer"
                            title="삭제"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/>
                            </svg>
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
```

> 거래처명 셀은 이제 단순 텍스트(`text-center`)이며, 행 전체가 상세 페이지로 이동한다. 액션 `<td>`에 `stopPropagation`을 걸어 삭제 버튼 클릭이 행 이동을 트리거하지 않게 한다.

- [ ] **Step 4: 안내 문구 갱신(선택) — 헤더 설명에 클릭 힌트**

헤더 설명 `<p>`(기존 라인 167~170)를 아래로 교체:

```tsx
          <p className="text-muted-foreground text-sm">
            청구서가 참조하는 거래처(회사) 관리 · 행을 클릭하면 상세정보
            {!isAdmin && ' · 수정은 관리자만 가능'}
          </p>
```

- [ ] **Step 5: 타입 체크 + 린트**

Run: `npm run type-check && npx eslint "src/app/(dashboard)/admin/clients/page.tsx"`
Expected: PASS (0 error) — 사용하지 않는 import(`ClientNameCell` 관련) 잔재가 없어야 한다.

- [ ] **Step 6: Commit**

```bash
git add "src/app/(dashboard)/admin/clients/page.tsx"
git commit -m "Feat: 거래처 목록 행 클릭 시 상세 페이지 이동(인라인 편집 일원화)"
```

---

## Task 8: 통합 검증

**Files:** (없음 — 검증 전용)

- [ ] **Step 1: 전체 타입 체크 · 린트 · 빌드**

Run: `npm run type-check && npm run lint && npm run build`
Expected: 모두 PASS (0 error). 빌드 시 `/admin/clients/[id]` 라우트가 정상 컴파일.

- [ ] **Step 2: 단위 테스트(기존 회귀 확인)**

Run: `npx vitest run`
Expected: 기존 테스트 전부 PASS (clientCode 등 회귀 없음).

- [ ] **Step 3: 개발 서버 + Playwright 수동 검증(인증 ADMIN 세션, 포트 3001)**

검증 시나리오:
1. `/admin/clients` 진입 → 표 행에 마우스오버 시 `cursor-pointer`, 행 클릭 → `/admin/clients/[id]` 이동.
2. 상세 페이지 헤더에 `CL-NNN 거래처명` 가운데 표시. 탭 4개(기본정보·담당정보·은행정보·프로젝트) 가운데 정렬로 노출.
3. 기본정보 탭: 거래처 코드·등록일 읽기전용, 거래처명·대표자·사업자 등록번호·주소 클릭 → 가운데 정렬 input 편집 → Enter 저장 → 값 반영. 비우고 저장 시 `미입력`.
4. 담당정보/은행정보 탭: 각 필드 편집·저장 정상.
5. 프로젝트 탭: 연결 청구서가 있으면 거래명·일자·상태·공급가액 표(가운데 정렬), 없으면 "진행한 프로젝트(청구서)가 없습니다." 표시.
6. 목록 삭제 버튼 클릭 → 행 이동되지 않고 삭제 확인만 노출(`stopPropagation` 동작).
7. 다크/라이트 모드 모두 레이아웃·색 정상.

- [ ] **Step 4: (사용자 지시 시에만) 커밋·푸시·머지**

> 자동 금지. 사용자가 명시적으로 요청할 때만 진행.

---

## Self-Review

**1. Spec coverage**
- ✅ 목록 셀 클릭 → 상세 (Task 7 행 클릭 → Task 6 페이지)
- ✅ 4개 섹션 탭 형식 (Task 6 `TABS` 탭 버튼 + 콘텐츠 분기)
- ✅ 기본정보(거래처 코드·거래처명·대표자·사업자 등록번호·주소·등록일), 거래처명/대표자/사업자/주소 수정 가능 (Task 6 basic 탭 + EditableField)
- ✅ 담당정보(담당자·연락처·이메일·부서/직함) (Task 6 manager 탭)
- ✅ 은행정보(은행명·계좌번호·예금주) (Task 6 bank 탭)
- ✅ 프로젝트(진행 프로젝트 + 최근 거래 내역) (Task 5 ClientProjectsTab, invoices 재사용)
- ✅ 텍스트 정렬(전 입력칸·표 가운데) — Global Constraints + 각 컴포넌트 className

**2. Placeholder scan:** 모든 코드 블록은 실제 구현 코드. TBD/TODO 없음.

**3. Type consistency:**
- `EditableField`의 props(`clientId, field, label, value, editable, onSaved`)가 Task 6 호출부와 일치.
- `onSaved(field, value)` 시그니처가 Task 6 `handleSaved(field, value)`와 일치.
- `ClientProjectsTab` props(`clientId`)가 Task 6 호출부와 일치.
- `Client` 새 필드명(`representative` 등)이 마이그레이션 컬럼명·스키마 키·`PATCHABLE_FIELDS`·EditableField `field` prop 전부 동일.
- `STATUS_LABEL`/`STATUS_STYLE`는 `InvoiceStatusSelect.tsx`의 기존 export 재사용(중복 정의 없음).

---

## Execution Handoff

다음 두 가지 실행 방식 중 선택해 주세요.
