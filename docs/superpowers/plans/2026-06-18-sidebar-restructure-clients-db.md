# 사이드바 재구성 + 거래처 DB 페이지 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 사이드바 섹션을 [메뉴]·[인보이스]·[데이터베이스]·[관리]로 재구성(청구서/정산서 트리화·라벨 변경)하고, 새 데이터베이스 섹션의 "거래처 DB" 관리 페이지를 추가한다.

**Architecture:** 사이드바는 `AppSidebar.tsx`의 `NAV_ITEMS` 배열(섹션=등장순서, children=확장 트리)을 재배열·재라벨한다. "거래처 DB"는 기존 `clients` 테이블 위에 관리 페이지(`/admin/clients`)와 GET(전체)·PATCH API를 얹는다. 검색 팔레트(SCOPES)는 라벨 변경·거래처 스코프 추가로 동기화한다.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript strict, Supabase, Zod, Tailwind v4, vitest(node), Playwright(검증).

## Global Constraints

- TypeScript strict — `any` 금지. 들여쓰기 2칸. 주석 한국어. camelCase/PascalCase.
- 신규 npm 의존성 금지. 사이드바 트리·드롭다운·정렬은 기존 패턴(`AppSidebar` children, `SortableHeader`/`useTableSort`) 재사용.
- **라벨만 변경**(프라이스 테이블→용역 단가, 관리자용→계정 관리)은 **라우트/페이지/동작 불변** — `/admin/price-table`, `/admin/accounts` 그대로.
- **섹션 순서:** 메뉴 → 인보이스 → 데이터베이스 → 관리 (NAV_ITEMS 등장 순서가 섹션 순서).
- **표 정렬:** 헤더·셀 가운데 정렬, 정렬 아이콘/hover 아이콘은 텍스트 옆 절대배치(텍스트 기준 중앙, 겹침 금지) — 최근 적용한 규칙 동일.
- **거래처 삭제 미제공:** invoices가 `client_id` FK로 참조 → 하드 삭제 대신 `is_active` 토글(사용중/미사용).
- DB 스키마 변경 **없음**(clients 테이블이 이미 충분). Supabase **MCP(읽기 조회)·CLI(마이그레이션)** 는 선택적 보조이며 이 작업엔 마이그레이션 불필요.
- 커밋/푸시/머지는 **사용자가 명시적으로 지시할 때만**. dev 서버 포트 **3001**.

---

## File Structure

| 파일 | 책임 | 작업 |
|---|---|---|
| `src/app/api/clients/route.ts` | GET에 `?all=1`(전체) 지원 | 수정 |
| `src/app/api/clients/[id]/route.ts` | 거래처 이름/상태 PATCH(ADMIN) | 신규 |
| `src/lib/validation/schemas.ts` | `clientUpdateSchema` | 수정(추가) |
| `src/types/invoice.ts` | `Client.created_at?` | 수정(소) |
| `src/app/(dashboard)/admin/clients/page.tsx` | 거래처 DB 관리 페이지 | 신규 |
| `src/components/layout/AppSidebar.tsx` | NAV_ITEMS 재구성·재라벨 | 수정 |
| `src/components/search/searchFilter.ts` | `clients` 스코프 데이터 소스 | 수정 |
| `src/components/search/CommandPalette.tsx` | SCOPES 라벨/순서/거래처 추가 | 수정 |

**현재 사실(조사):**
- `AppSidebar.NAV_ITEMS`: 섹션 메뉴/인보이스/정산/관리. 인보이스=거래처청구서(/invoices)·내부지급서(/payouts) 단일 항목. 정산=정산서 트리(저작권료/용역). 관리=구성원·작가마스터·저작물DB(트리)·프라이스테이블·관리자용. 트리는 `children` 배열, 섹션 라벨은 `section`. 섹션 순서=첫 등장 순서(Map). 권한 `staffOnly`/`adminOnly`는 부모 NavItem에만(children엔 없음).
- `clients` 테이블: `id, name TEXT UNIQUE, is_active BOOLEAN DEFAULT true, created_at`. RLS staff. invoices가 `client_id` 참조. 시드 3건(플레디스/젤리피쉬엔터테인먼트/LABEL SJ).
- `/api/clients`: GET(is_active=true만, 자동완성용)·POST(추가/기존반환). **PATCH·관리 페이지 없음.**
- `Client` 타입 = `{ id, name, is_active }`. `clientCreateSchema = { name: trim.min1 }`.
- 검색 `CommandPalette.SCOPES`(flat) + `searchFilter.SCOPE_SOURCES`: 라벨에 '프라이스 테이블'·'관리자용' 존재, clients 스코프 없음.

---

## Task 1: 거래처 API 보강 (GET 전체 + PATCH) + 검증/타입

**Files:**
- Modify: `src/app/api/clients/route.ts`
- Create: `src/app/api/clients/[id]/route.ts`
- Modify: `src/lib/validation/schemas.ts`
- Modify: `src/types/invoice.ts`

**Interfaces:**
- Produces: `GET /api/clients?all=1` → `{ clients: {id,name,is_active,created_at}[] }`; `PATCH /api/clients/[id]` body `{ name?, is_active? }` → `{ client }`; `clientUpdateSchema`.

- [ ] **Step 1: Client 타입에 created_at 추가** — `src/types/invoice.ts` (현재 57~61행)

변경 전:
```ts
export interface Client {
  id: string;
  name: string;
  is_active: boolean;
}
```
변경 후:
```ts
export interface Client {
  id: string;
  name: string;
  is_active: boolean;
  created_at?: string; // 거래처 DB 관리 페이지용(테이블에 존재). 조인 결과엔 없을 수 있어 optional
}
```

- [ ] **Step 2: clientUpdateSchema 추가** — `src/lib/validation/schemas.ts`, `clientCreateSchema`(현재 133~135행) 바로 아래

```ts
export const clientUpdateSchema = z.object({
  name: z.string().trim().min(1, '거래처명은 필수입니다.').optional(),
  is_active: z.boolean().optional(),
});
```

- [ ] **Step 3: GET에 `?all=1` 추가** — `src/app/api/clients/route.ts`의 GET 함수 교체(현재 8~28행)

```ts
export async function GET(request: NextRequest) {
  try {
    const auth = await requireStaff();
    if (isErrorResponse(auth)) return auth;

    // ?all=1 → 비활성 포함 전체(관리 페이지용). 기본은 활성만(자동완성용).
    const all = new URL(request.url).searchParams.get('all') === '1';
    let query = auth.adminClient
      .from('clients')
      .select('id, name, is_active, created_at')
      .order('name');
    if (!all) query = query.eq('is_active', true);

    const { data, error } = await query;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ clients: data });
  } catch (err) {
    console.error('거래처 API 오류:', err);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
```

> POST 함수는 변경 없음.

- [ ] **Step 4: PATCH 라우트 생성** — `src/app/api/clients/[id]/route.ts`

```ts
// 거래처 수정 — 이름/사용여부(is_active) (ADMIN only)

import { NextRequest, NextResponse } from 'next/server';
import { requireStaff, isErrorResponse } from '@/lib/auth/apiAuth';
import { parseBody } from '@/lib/validation/parse';
import { clientUpdateSchema } from '@/lib/validation/schemas';

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

    const updates: Record<string, unknown> = {};
    if (parsed.data.name !== undefined) updates.name = parsed.data.name;
    if (parsed.data.is_active !== undefined) updates.is_active = parsed.data.is_active;
    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: '변경할 내용이 없습니다.' }, { status: 400 });
    }

    const { data, error } = await auth.adminClient
      .from('clients')
      .update(updates)
      .eq('id', id)
      .select('id, name, is_active, created_at')
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: '이미 존재하는 거래처명입니다.' }, { status: 409 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ client: data });
  } catch (err) {
    console.error('거래처 수정 API 오류:', err);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
```

- [ ] **Step 5: 타입·린트**

Run: `npm run type-check && npx eslint src/app/api/clients/route.ts "src/app/api/clients/[id]/route.ts" src/lib/validation/schemas.ts`
Expected: 출력 없음(에러 0)

- [ ] **Step 6: 커밋(사용자 지시 시)**

```bash
git add src/app/api/clients/route.ts "src/app/api/clients/[id]/route.ts" src/lib/validation/schemas.ts src/types/invoice.ts
git commit -m "Feat: 거래처 API 전체조회(?all)·수정(PATCH) + 검증 스키마"
```

---

## Task 2: 거래처 DB 관리 페이지

**Files:**
- Create: `src/app/(dashboard)/admin/clients/page.tsx`

**Interfaces:**
- Consumes: `GET /api/clients?all=1`, `POST /api/clients`, `PATCH /api/clients/[id]` (Task 1), `Client` 타입.

- [ ] **Step 1: 페이지 작성** — `src/app/(dashboard)/admin/clients/page.tsx`

```tsx
'use client';

// 거래처 DB — 청구서가 참조하는 거래처(회사) 관리. 조회: ADMIN/STAFF · 수정: ADMIN only.
// 삭제는 청구서 FK 참조 때문에 미제공 → '미사용'(is_active=false) 토글로 비활성화.

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useAuthStore } from '@/store/authStore';
import type { Client } from '@/types/invoice';
import { useTableSort } from '@/hooks/useTableSort';
import { useRowFocus } from '@/hooks/useRowFocus';
import { SortableHeader } from '@/components/ui/SortableHeader';

// 거래처명 인라인 편집 셀 (텍스트 가운데, 연필 아이콘은 절대배치로 겹침 없이 함께 이동)
function ClientNameCell({
  id,
  name,
  editable,
  onSaved,
}: {
  id: string;
  name: string;
  editable: boolean;
  onSaved: (id: string, name: string) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(name);
  const [saving, setSaving] = useState(false);

  const handleSave = useCallback(async () => {
    const next = draft.trim();
    if (!next || next === name) { setIsEditing(false); setDraft(name); return; }
    setSaving(true);
    try {
      const res = await fetch(`/api/clients/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: next }),
      });
      if (res.ok) { onSaved(id, next); setIsEditing(false); }
    } finally {
      setSaving(false);
    }
  }, [id, draft, name, onSaved]);

  if (!editable) return <span className="text-foreground">{name}</span>;

  if (isEditing) {
    return (
      <input
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleSave();
          if (e.key === 'Escape') { setDraft(name); setIsEditing(false); }
        }}
        onBlur={handleSave}
        autoFocus
        disabled={saving}
        className="w-40 px-2 py-1 text-xs text-center bg-background border border-primary rounded outline-none text-foreground"
      />
    );
  }

  return (
    <span className="relative inline-block group">
      <span className="text-foreground">{name}</span>
      <button
        onClick={() => { setDraft(name); setIsEditing(true); }}
        className="absolute left-full top-1/2 -translate-y-1/2 ml-1 opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-foreground transition rounded hover:bg-primary/10"
        title="거래처명 수정"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
        </svg>
      </button>
    </span>
  );
}

// 사용여부 토글 — 사용중(초록)/미사용(빨강). 클릭 시 전환. ADMIN만.
function StatusCell({ active, editable, onToggle }: { active: boolean; editable: boolean; onToggle: () => void }) {
  const cls = active ? 'text-green-500' : 'text-red-400';
  const label = active ? '사용중' : '미사용';
  if (!editable) {
    return <span className={`inline-block px-3 py-1 rounded-md text-xs font-medium ${active ? 'bg-green-500/15' : 'bg-red-500/15'} ${cls}`}>{label}</span>;
  }
  return (
    <button
      type="button"
      onClick={onToggle}
      title={active ? '클릭하면 미사용' : '클릭하면 사용중'}
      className={`inline-block px-3 py-1 rounded-md text-xs font-medium transition cursor-pointer ${
        active ? 'bg-green-500/20 text-green-500 hover:bg-green-500/30' : 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
      }`}
    >
      {label}
    </button>
  );
}

export default function ClientsDbPage() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN';

  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  };

  const fetchClients = useCallback(async () => {
    try {
      const res = await fetch('/api/clients?all=1');
      if (!res.ok) throw new Error('목록을 불러올 수 없습니다.');
      setClients((await res.json()).clients || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- async fetch (마이크로태스크에서 setState)
  useEffect(() => { fetchClients(); }, [fetchClients]);

  const handleAdd = async () => {
    if (!newName.trim()) { showToast('거래처명을 입력하세요'); return; }
    const res = await fetch('/api/clients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim() }),
    });
    if (res.ok) {
      setAdding(false);
      setNewName('');
      fetchClients();
      showToast('거래처 등록 완료');
    } else {
      showToast((await res.json()).error || '등록 실패');
    }
  };

  const patchClient = async (id: string, patch: { name?: string; is_active?: boolean }) => {
    const res = await fetch(`/api/clients/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    if (res.ok) {
      const { client } = await res.json();
      setClients((prev) => prev.map((c) => (c.id === id ? client : c)));
      showToast('저장 완료');
    } else {
      showToast((await res.json()).error || '저장 실패');
    }
  };

  const handleNameSaved = useCallback((id: string, name: string) => {
    setClients((prev) => prev.map((c) => (c.id === id ? { ...c, name } : c)));
  }, []);

  const { sortKey, dir, toggle, sortRows } = useTableSort<Client>({
    name: (c) => c.name,
    is_active: (c) => (c.is_active ? 1 : 0),
    created_at: (c) => c.created_at ?? '',
  }, 'pf_sort_clients');

  const sorted = useMemo(() => sortRows(clients), [clients, sortRows]);

  useRowFocus(!isLoading && sorted.length > 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">거래처 DB</h1>
          <p className="text-muted-foreground text-sm">
            청구서가 참조하는 거래처(회사) 관리
            {!isAdmin && ' · 수정은 관리자만 가능'}
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => { setNewName(''); setAdding((v) => !v); }}
            className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition font-medium cursor-pointer"
          >
            + 등록
          </button>
        )}
      </div>

      {adding && (
        <div className="bg-card border border-primary/40 rounded-lg p-4 flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs text-muted-foreground mb-1 text-center">거래처명</label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }}
              placeholder="거래처명 입력"
              autoFocus
              className="w-64 px-3 py-2 text-sm text-center bg-background border border-border rounded-lg outline-none focus:border-primary text-foreground"
            />
          </div>
          <button
            onClick={handleAdd}
            className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition cursor-pointer"
          >
            추가
          </button>
        </div>
      )}

      <div className="bg-card border border-border rounded-lg overflow-hidden w-full max-w-3xl mx-auto">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-border border-t-primary mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">데이터 로딩 중...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center"><p className="text-red-400">오류: {error}</p></div>
        ) : sorted.length === 0 ? (
          <div className="p-8 text-center"><p className="text-muted-foreground">등록된 거래처가 없습니다.</p></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-primary/10 border-b border-border">
                <tr>
                  <SortableHeader label="거래처명" sortKey="name" activeKey={sortKey} dir={dir} onSort={toggle} align="center" className="px-6 py-3 text-xs uppercase" />
                  <SortableHeader label="상태" sortKey="is_active" activeKey={sortKey} dir={dir} onSort={toggle} align="center" className="px-6 py-3 text-xs uppercase" />
                  <SortableHeader label="등록일" sortKey="created_at" activeKey={sortKey} dir={dir} onSort={toggle} align="center" className="px-6 py-3 text-xs uppercase" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {sorted.map((c) => (
                  <tr key={c.id} id={`row-${c.id}`} className="hover:bg-primary/5">
                    <td className="px-6 py-3 text-center">
                      <ClientNameCell id={c.id} name={c.name} editable={isAdmin} onSaved={handleNameSaved} />
                    </td>
                    <td className="px-6 py-3 text-center">
                      <StatusCell active={c.is_active} editable={isAdmin} onToggle={() => patchClient(c.id, { is_active: !c.is_active })} />
                    </td>
                    <td className="px-6 py-3 text-center text-muted-foreground text-xs">
                      {c.created_at ? new Date(c.created_at).toLocaleDateString('ko-KR') : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-foreground text-background text-sm px-4 py-2 rounded-full shadow-lg z-50 pointer-events-none">
          {toast}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: 타입·린트**

Run: `npm run type-check && npx eslint "src/app/(dashboard)/admin/clients/page.tsx"`
Expected: 출력 없음(에러 0)

- [ ] **Step 3: Playwright(인증·ADMIN, 포트 3001)** — `/admin/clients` 직접 접속:
  1. 표에 시드 거래처(플레디스/젤리피쉬엔터테인먼트/LABEL SJ) 노출, 컬럼 가운데 정렬.
  2. `+ 등록` → 거래처명 입력 → 추가 → 목록 반영.
  3. 거래처명 hover→연필→수정 저장. 상태 토글 사용중↔미사용.
  > 검증으로 추가/변경한 거래처는 정리(이름 원복·미사용 처리)할 것.

- [ ] **Step 4: 커밋(사용자 지시 시)**

```bash
git add "src/app/(dashboard)/admin/clients/page.tsx"
git commit -m "Feat: 거래처 DB 관리 페이지(/admin/clients)"
```

---

## Task 3: 사이드바 NAV_ITEMS 재구성

**Files:**
- Modify: `src/components/layout/AppSidebar.tsx`

- [ ] **Step 1: NAV_ITEMS 전체 교체** — 현재 36~69행

```ts
const NAV_ITEMS: NavItem[] = [
  // 메뉴 섹션
  { label: '홈 피드', href: '/', icon: '🏠', section: '메뉴' },
  { label: '매출현황', href: '/revenue', icon: '📈', staffOnly: true, section: '메뉴' },
  // 인보이스 섹션 — 청구서(트리) + 정산서(트리)
  {
    label: '청구서',
    icon: '🧾',
    staffOnly: true,
    section: '인보이스',
    children: [
      { label: '거래처 청구서', href: '/invoices' },
      { label: '내부 지급서', href: '/payouts' },
    ],
  },
  {
    label: '정산서',
    icon: '📄',
    section: '인보이스',
    children: [
      { label: '저작권료 정산', href: '/settlement/royalty' },
      { label: '용역 정산', href: '/settlement/service' },
    ],
  },
  // 데이터베이스 섹션 — 거래처 DB · 저작물 DB(트리) · 용역 단가
  { label: '거래처 DB', href: '/admin/clients', icon: '🏢', staffOnly: true, section: '데이터베이스' },
  {
    label: '저작물 DB',
    icon: '🎵',
    staffOnly: true,
    section: '데이터베이스',
    children: [
      { label: '영구 저작물 DB', href: '/admin/works/permanent' },
      { label: '일반 저작물 DB', href: '/admin/works/general' },
    ],
  },
  { label: '용역 단가', href: '/admin/price-table', icon: '💰', staffOnly: true, section: '데이터베이스' },
  // 관리 섹션
  { label: '구성원', href: '/staff', icon: '👥', section: '관리' },
  { label: '작가 마스터', href: '/admin/writers', icon: '✍️', staffOnly: true, section: '관리' },
  { label: '계정 관리', href: '/admin/accounts', icon: '⚙️', adminOnly: true, section: '관리' },
];
```

> 트리 펼침(openTree)·활성판정(isActive)·섹션 그룹핑은 기존 로직이 `children`/`section` 기준이라 코드 변경 불필요(자동 반영).

- [ ] **Step 2: 타입·린트**

Run: `npm run type-check && npx eslint src/components/layout/AppSidebar.tsx`
Expected: 출력 없음(에러 0)

- [ ] **Step 3: Playwright 검증** — 임의 페이지에서 사이드바:
  1. 섹션 순서 `메뉴 → 인보이스 → 데이터베이스 → 관리`.
  2. 인보이스에 `청구서`·`정산서` 트리(클릭 시 자식 펼침: 거래처 청구서/내부 지급서, 저작권료/용역).
  3. 데이터베이스에 `거래처 DB`·`저작물 DB`·`용역 단가` 순서.
  4. 관리에 `구성원`·`작가 마스터`·`계정 관리`.

- [ ] **Step 4: 커밋(사용자 지시 시)**

```bash
git add src/components/layout/AppSidebar.tsx
git commit -m "Feat: 사이드바 재구성(인보이스 청구서/정산서 트리·데이터베이스 섹션·라벨 변경)"
```

---

## Task 4: 검색 팔레트 동기화 (라벨 + 거래처 스코프)

**Files:**
- Modify: `src/components/search/searchFilter.ts`
- Modify: `src/components/search/CommandPalette.tsx`

**Interfaces:**
- Produces: `ScopeKey`에 `'clients'` 추가; `SCOPE_SOURCES.clients`.

- [ ] **Step 1: ScopeKey + clients 소스 추가** — `src/components/search/searchFilter.ts`

`ScopeKey` 유니온(현재)에 `'clients'` 추가:
```ts
export type ScopeKey =
  | 'home' | 'revenue' | 'invoices' | 'payouts' | 'royalty' | 'service'
  | 'staff' | 'writers' | 'clients' | 'permWorks' | 'genWorks' | 'price' | 'accounts';
```

원본 lite 인터페이스 묶음에 추가:
```ts
interface ClientLite { id: string; name: string; is_active: boolean }
```

`SCOPE_SOURCES` 객체에 `clients` 항목 추가(예: `price` 항목 앞):
```ts
  clients: {
    url: '/api/clients?all=1', jsonKey: 'clients',
    toItems: (rows) => (rows as ClientLite[]).map((c) => ({
      id: `cl-${c.id}`, primary: c.name, secondary: c.is_active ? undefined : '미사용',
      href: `/admin/clients?focus=${c.id}`, searchText: c.name,
    })),
  },
```

- [ ] **Step 2: CommandPalette SCOPES 갱신(라벨·순서·거래처)** — `src/components/search/CommandPalette.tsx`

lucide import에 `Building2` 추가(기존 아이콘 import 블록):
```tsx
import {
  Home, TrendingUp, FileText, Wallet, Music, Briefcase, Users,
  PenSquare, Building2, Disc, Disc3, Receipt, Settings, ChevronLeft, CornerDownRight,
  type LucideIcon,
} from 'lucide-react';
```

`SCOPES` 배열을 사이드바 순서에 맞춰 교체(거래처 추가, 프라이스→용역 단가, 관리자용→계정 관리):
```tsx
const SCOPES: Scope[] = [
  { key: 'home', label: '홈 피드', icon: Home, href: '/', perm: 'all' },
  { key: 'revenue', label: '매출현황', icon: TrendingUp, href: '/revenue', perm: 'staff' },
  { key: 'invoices', label: '거래처 청구서', icon: FileText, href: '/invoices', perm: 'staff' },
  { key: 'payouts', label: '내부 지급서', icon: Wallet, href: '/payouts', perm: 'staff' },
  { key: 'royalty', label: '저작권료 정산', icon: Music, href: '/settlement/royalty', perm: 'all' },
  { key: 'service', label: '용역 정산', icon: Briefcase, href: '/settlement/service', perm: 'all' },
  { key: 'clients', label: '거래처 DB', icon: Building2, href: '/admin/clients', perm: 'staff' },
  { key: 'permWorks', label: '영구 저작물 DB', icon: Disc, href: '/admin/works/permanent', perm: 'staff' },
  { key: 'genWorks', label: '일반 저작물 DB', icon: Disc3, href: '/admin/works/general', perm: 'staff' },
  { key: 'price', label: '용역 단가', icon: Receipt, href: '/admin/price-table', perm: 'staff' },
  { key: 'staff', label: '구성원', icon: Users, href: '/staff', perm: 'all' },
  { key: 'writers', label: '작가 마스터', icon: PenSquare, href: '/admin/writers', perm: 'staff' },
  { key: 'accounts', label: '계정 관리', icon: Settings, href: '/admin/accounts', perm: 'admin' },
];
```

> `permWorks`/`genWorks`/`writers`/`staff`/`accounts`의 href·perm은 불변(라벨/순서만 조정). `clients` 스코프는 `SCOPE_SOURCES.clients`(Step 1)로 검색 데이터가 연결된다.

- [ ] **Step 3: 타입·린트**

Run: `npm run type-check && npx eslint src/components/search/searchFilter.ts src/components/search/CommandPalette.tsx`
Expected: 출력 없음(에러 0)

- [ ] **Step 4: Playwright 검증** — 검색(⌘K) 빠른 액션: `거래처 DB`·`용역 단가`·`계정 관리` 라벨 노출. `거래처 DB` 진입 후 검색어 입력 시 거래처가 검색되고 선택 시 `/admin/clients?focus=…`로 이동.

- [ ] **Step 5: 커밋(사용자 지시 시)**

```bash
git add src/components/search/searchFilter.ts src/components/search/CommandPalette.tsx
git commit -m "Feat: 검색 팔레트 라벨 동기화 + 거래처 DB 스코프"
```

---

## Task 5: 통합 검증

**Files:** (변경 없음 — 전체 검증)

- [ ] **Step 1: 정적 검사 + 단위테스트**

Run:
```bash
npm run type-check
npx eslint src/
npx vitest run
```
Expected: type-check 0 / eslint 0 errors(기존 img 경고 무관) / vitest 전체 통과.

- [ ] **Step 2: 빌드**

Run: `npm run build`
Expected: 성공(`/admin/clients` 라우트 포함).

- [ ] **Step 3: Playwright 엔드투엔드(인증·ADMIN, 포트 3001)**

1. **사이드바:** 섹션 순서 `메뉴/인보이스/데이터베이스/관리`. 인보이스=청구서·정산서 트리. 데이터베이스=거래처 DB·저작물 DB·용역 단가. 관리=구성원·작가 마스터·계정 관리. 트리 펼침 동작.
2. **라우팅:** 각 메뉴/하위메뉴 클릭 시 기존 페이지로 이동(404 없음). 거래처 DB → `/admin/clients`.
3. **거래처 DB:** 등록·이름수정·상태토글 동작(검증 데이터는 원복).
4. **검색:** 라벨 동기화(용역 단가·계정 관리·거래처 DB), 거래처 스코프 검색·이동.
5. 콘솔 에러 0.

- [ ] **Step 4: 커밋(사용자 지시 시)** — 잔여 정리 커밋.

---

## Self-Review

**1. Spec coverage**
- 인보이스: 거래처청구서·내부지급서를 청구서 트리로 묶음 → Task 3. ✓
- 정산 섹션 삭제 + 정산서(트리) 인보이스로 이동 → Task 3(정산서 section '인보이스'). ✓
- 관리자용 → 계정 관리 → Task 3(라벨) + Task 4(검색). ✓
- 인보이스↔관리 사이 데이터베이스 섹션 → Task 3(등장 순서). ✓
- 데이터베이스에 저작물 DB·프라이스(→용역 단가) 이동 + 거래처 DB 추가, 순서 [거래처 DB·저작물 DB·용역 단가] → Task 3. ✓
- 거래처 DB 실동작(메뉴→페이지) → Task 1(API)·Task 2(페이지). ✓

**2. Placeholder scan** — 모든 코드 스텝에 실제 코드/명령/기대출력. "TODO/적절히" 없음. ✓

**3. Type consistency**
- `clientUpdateSchema`(Task1) = PATCH 라우트·페이지 PATCH 호출 일치. ✓
- `Client.created_at?`(Task1) = 페이지 정렬/표시(Task2) 일치. ✓
- `ScopeKey`에 'clients'(Task4 searchFilter) = `SCOPE_SOURCES.clients`·CommandPalette `clients` 스코프 일치. ✓
- href 규약: 거래처 DB `/admin/clients`(사이드바·검색·페이지 라우트) 일치. ✓

**알려진 한계(문서화):** 거래처는 하드 삭제 미제공(invoices FK) — `is_active` 토글로 비활성화. 라벨 변경(용역 단가/계정 관리)은 라우트 불변이라 URL은 그대로(`/admin/price-table`·`/admin/accounts`). 검색 팔레트 동기화(Task 4)는 일관성 목적의 부가 작업으로, 사이드바(Task 3)와 독립적으로 검토 가능.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-06-18-sidebar-restructure-clients-db.md`. Two execution options:

1. **Subagent-Driven (recommended)** — 태스크마다 새 서브에이전트 디스패치, 태스크 사이 리뷰.
2. **Inline Execution** — 이 세션에서 executing-plans로 체크포인트 배치 실행.

Which approach?
