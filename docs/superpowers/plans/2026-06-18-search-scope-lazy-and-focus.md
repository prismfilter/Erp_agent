# 검색 스코프 lazy 검색 + 결과 행 포커스 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 검색 팔레트에서 빠른액션(스코프) 진입 시 목록을 미리 띄우지 않고 검색어 입력 시에만 결과를 보여주며, 결과를 선택하면 대상 페이지의 해당 행으로 스크롤 + 하이라이트한다.

**Architecture:** CommandPalette를 "사전 prefetch + cmdk 자동필터"에서 "스코프 진입 시 lazy fetch + 수동필터(상한)"로 전환한다. 순수 검색 로직과 스코프 데이터 소스는 `searchFilter.ts`로 분리해 vitest로 단위테스트한다. 결과 이동 URL에 `?focus=<id>`(영구저작물은 `?writer=&focus=`)를 실어 보내고, 대상 표 페이지는 공용 훅 `useRowFocus`로 그 행을 찾아 스크롤·하이라이트한다.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript strict, Tailwind CSS v4, cmdk, lucide-react, vitest(node), Playwright(검증).

## Global Constraints

- TypeScript strict — `any` 금지(불가피한 경계는 `unknown` + 지역 캐스트).
- 들여쓰기 2칸, 컴포넌트 PascalCase, 변수/함수 camelCase, 주석 한국어.
- 신규 npm 의존성 추가 금지(cmdk·lucide-react·기존 도구만 사용).
- vitest 환경은 **node 전용**(`src/**/*.test.ts`, DOM 불가) — 순수 함수만 단위테스트, DOM/라우터는 Playwright로 검증.
- 상세페이지로 이동하는 스코프(거래처 청구서·내부 지급서·용역 정산)는 항목이 곧 화면이므로 (C) 포커스 작업 **불필요**.
- 커밋/푸시/머지는 **사용자가 명시적으로 지시할 때만** 수행(프로젝트 표준 규칙). 아래 커밋 스텝은 "지시가 있을 때" 실행한다.
- dev 서버는 포트 **3001**(`npm run dev`). 검증은 인증 세션으로.

---

## File Structure

| 파일 | 책임 | 작업 |
|---|---|---|
| `src/components/search/searchFilter.ts` | 순수 검색 로직(matchesQuery·filterAndCap) + 정규화 타입(ScopeItem) + 스코프 데이터 소스(SCOPE_SOURCES, href에 focus 파라미터 포함) | 신규 |
| `src/components/search/searchFilter.test.ts` | 위 순수 로직 단위테스트 | 신규 |
| `src/components/search/CommandPalette.tsx` | 팔레트 UI — lazy fetch + 수동필터 + 빈검색 시 목록 미표시 | 수정(대규모) |
| `src/hooks/useRowFocus.ts` | `?focus=<id>` 행으로 스크롤 + 하이라이트 | 신규 |
| `src/app/globals.css` | `.row-focus-highlight` 키프레임 | 수정(추가) |
| `src/app/(dashboard)/admin/writers/page.tsx` | 작가 행 포커스 | 수정(소) |
| `src/app/(dashboard)/staff/page.tsx` | 구성원 행 포커스 | 수정(소) |
| `src/app/(dashboard)/admin/price-table/page.tsx` | 프라이스 행 포커스 | 수정(소) |
| `src/app/(dashboard)/admin/works/permanent/page.tsx` | 영구저작물 행 포커스(+`?writer` 자동선택) | 수정(소) |

**현재 동작(변경 전 사실):** `CommandPalette.tsx`는 open 시 6개 API를 `Promise.all`로 prefetch하고(`loaded`), 스코프 진입 시 `search`와 무관하게 `renderScopeData()`로 목록을 항상 렌더하며, `shouldFilter`(cmdk 자동필터)로 전 항목을 마운트한 뒤 비매칭을 숨긴다. 데이터 항목 onSelect는 목록 페이지로만 이동(특정 행 미지정).

---

## Task 1: 순수 검색 유틸 + 스코프 데이터 소스 (TDD)

**Files:**
- Create: `src/components/search/searchFilter.ts`
- Test: `src/components/search/searchFilter.test.ts`

**Interfaces:**
- Produces:
  - `type ScopeKey = 'home'|'revenue'|'invoices'|'payouts'|'royalty'|'service'|'staff'|'writers'|'permWorks'|'genWorks'|'price'|'accounts'`
  - `interface ScopeItem { id: string; primary: string; secondary?: string; href: string; searchText: string }`
  - `interface ScopeSource { url: string; jsonKey: string; toItems: (rows: unknown[]) => ScopeItem[] }`
  - `matchesQuery(haystack: string, query: string): boolean`
  - `filterAndCap(items: ScopeItem[], query: string, max: number): ScopeItem[]`
  - `SCOPE_SOURCES: Partial<Record<ScopeKey, ScopeSource>>`

- [ ] **Step 1: 실패하는 테스트 작성** — `src/components/search/searchFilter.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { matchesQuery, filterAndCap, SCOPE_SOURCES, type ScopeItem } from './searchFilter';

describe('matchesQuery', () => {
  it('빈 query는 항상 매칭', () => {
    expect(matchesQuery('박서준 일반작가', '')).toBe(true);
    expect(matchesQuery('박서준 일반작가', '   ')).toBe(true);
  });
  it('대소문자 무시 부분일치', () => {
    expect(matchesQuery('PRISM Filter', 'prism')).toBe(true);
  });
  it('여러 토큰을 모두 포함해야 매칭', () => {
    expect(matchesQuery('박서준 일반작가', '박서준 일반')).toBe(true);
    expect(matchesQuery('박서준 일반작가', '박서준 전속')).toBe(false);
  });
});

describe('filterAndCap', () => {
  const items: ScopeItem[] = Array.from({ length: 100 }, (_, i) => ({
    id: String(i), primary: `작가${i}`, href: `/x?focus=${i}`, searchText: `작가${i}`,
  }));
  it('상한 개수로 자른다', () => {
    expect(filterAndCap(items, '작가', 50)).toHaveLength(50);
  });
  it('매칭이 없으면 빈 배열', () => {
    expect(filterAndCap(items, 'zzz', 50)).toHaveLength(0);
  });
});

describe('SCOPE_SOURCES href에 포커스 파라미터 포함', () => {
  it('writers → ?focus=id', () => {
    const items = SCOPE_SOURCES.writers!.toItems([
      { id: 'w1', name: '박서준', writer_type: '일반작가' },
    ]);
    expect(items[0].href).toBe('/admin/writers?focus=w1');
    expect(items[0].primary).toBe('박서준');
  });
  it('permWorks → ?writer=&focus=', () => {
    const items = SCOPE_SOURCES.permWorks!.toItems([
      { id: 'k1', no: 1, writer_name: '김용후', song_title: 'X', komca_code: null, artist: null },
    ]);
    expect(items[0].href).toBe(`/admin/works/permanent?writer=${encodeURIComponent('김용후')}&focus=k1`);
  });
  it('service(상세 이동)는 focus 없이 상세 경로', () => {
    const items = SCOPE_SOURCES.service!.toItems([
      { id: 's1', writer_name: '이교창', period_start: '2026-06-01', period_end: '2026-06-30', total_amount: 1000 },
    ]);
    expect(items[0].href).toBe('/settlement/service/s1');
  });
});
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

Run: `npx vitest run src/components/search/searchFilter.test.ts`
Expected: FAIL — "Cannot find module './searchFilter'"

- [ ] **Step 3: 구현** — `src/components/search/searchFilter.ts`

```ts
// 커맨드 팔레트 검색 — 순수 로직(정규화 매칭·상한)과 스코프 데이터 소스 정의.
// DOM·React 비의존 → vitest(node)로 단위테스트. CommandPalette는 cmdk shouldFilter=false에서 이 필터를 직접 사용.

import { formatWon } from '@/lib/settlement/calculator';

// 빠른 액션 = 스코프. key로 데이터 소스를 분기한다.
export type ScopeKey =
  | 'home' | 'revenue' | 'invoices' | 'payouts' | 'royalty' | 'service'
  | 'staff' | 'writers' | 'permWorks' | 'genWorks' | 'price' | 'accounts';

// 스코프별 원본을 통일된 모양으로 정규화 → 렌더/필터/이동을 한 곳에서 처리
export interface ScopeItem {
  id: string;
  primary: string;        // 좌측 주 라벨
  secondary?: string;     // 우측 옅은 보조 텍스트
  href: string;           // 선택 시 이동 대상(필요 시 ?focus=/?writer= 포함)
  searchText: string;     // 매칭 대상 텍스트
}

export interface ScopeSource {
  url: string;
  jsonKey: string;
  toItems: (rows: unknown[]) => ScopeItem[];
}

// 원본 API 응답(필요 필드만)
interface InvoiceLite { id: string; title: string; client?: { name?: string | null } | null }
interface SettlementLite { id: string; writer_name: string; period_start: string; period_end: string; total_amount: number }
interface WriterLite { id: string; name: string; writer_type: string }
interface MemberLite { user_id: string; name: string | null; role: string }
interface WorkLite { id: string; no: number; writer_name: string; song_title: string; komca_code: string | null; artist: string | null }
interface PriceLite { id: string; category: string; name: string }

// 공백·대소문자 정규화 후, query의 각 토큰이 모두 haystack에 부분일치하면 true. 빈 query는 true.
export function matchesQuery(haystack: string, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (q === '') return true;
  const h = haystack.toLowerCase();
  return q.split(/\s+/).every((tok) => h.includes(tok));
}

// query로 거른 뒤 max개로 자른다(렌더 비용 상한 — 큰 목록 렉 방지).
export function filterAndCap(items: ScopeItem[], query: string, max: number): ScopeItem[] {
  const out: ScopeItem[] = [];
  for (const it of items) {
    if (matchesQuery(it.searchText, query)) out.push(it);
    if (out.length >= max) break;
  }
  return out;
}

// 검색 가능한 스코프의 데이터 소스. 여기 없는 스코프(home·revenue·royalty·genWorks·accounts)는 "페이지 열기"만 노출.
// 후일 대용량 시 url에 ?q= 디바운스 검색을 붙이는 단일 진입점.
export const SCOPE_SOURCES: Partial<Record<ScopeKey, ScopeSource>> = {
  invoices: {
    url: '/api/invoices', jsonKey: 'invoices',
    toItems: (rows) => (rows as InvoiceLite[]).map((i) => ({
      id: `inv-${i.id}`, primary: i.title, secondary: i.client?.name ?? undefined,
      href: `/invoices/${i.id}`, searchText: `${i.title} ${i.client?.name ?? ''}`,
    })),
  },
  payouts: {
    url: '/api/invoices', jsonKey: 'invoices',
    toItems: (rows) => (rows as InvoiceLite[]).map((i) => ({
      id: `pay-${i.id}`, primary: i.title, secondary: i.client?.name ?? undefined,
      href: `/invoices/${i.id}?tab=internal`, searchText: `${i.title} ${i.client?.name ?? ''}`,
    })),
  },
  service: {
    url: '/api/settlements/service', jsonKey: 'settlements',
    toItems: (rows) => (rows as SettlementLite[]).map((s) => ({
      id: `set-${s.id}`, primary: s.writer_name,
      secondary: `${s.period_start}~${s.period_end} · ${formatWon(s.total_amount)}`,
      href: `/settlement/service/${s.id}`, searchText: s.writer_name,
    })),
  },
  writers: {
    url: '/api/writers', jsonKey: 'writers',
    toItems: (rows) => (rows as WriterLite[]).map((w) => ({
      id: `wr-${w.id}`, primary: w.name, secondary: w.writer_type,
      href: `/admin/writers?focus=${w.id}`, searchText: `${w.name} ${w.writer_type}`,
    })),
  },
  staff: {
    url: '/api/admin/users', jsonKey: 'users',
    toItems: (rows) => (rows as MemberLite[]).map((m) => ({
      id: `mem-${m.user_id}`, primary: m.name || '(이름 없음)', secondary: m.role,
      href: `/staff?focus=${m.user_id}`, searchText: `${m.name ?? ''} ${m.role}`,
    })),
  },
  permWorks: {
    url: '/api/works?limit=100', jsonKey: 'works',
    toItems: (rows) => (rows as WorkLite[]).map((w) => ({
      id: `wk-${w.id}`, primary: w.song_title,
      secondary: `${w.writer_name}${w.artist ? ` · ${w.artist}` : ''}`,
      href: `/admin/works/permanent?writer=${encodeURIComponent(w.writer_name)}&focus=${w.id}`,
      searchText: `${w.song_title} ${w.writer_name} ${w.komca_code ?? ''} ${w.artist ?? ''}`,
    })),
  },
  price: {
    url: '/api/price-items?all=1', jsonKey: 'priceItems',
    toItems: (rows) => (rows as PriceLite[]).map((p) => ({
      id: `pr-${p.id}`, primary: p.name, secondary: p.category,
      href: `/admin/price-table?focus=${p.id}`, searchText: `${p.name} ${p.category}`,
    })),
  },
};
```

> 참고: `id`는 cmdk Command.Item의 value(선택 식별자)로도 쓰이므로 스코프 접두사로 충돌을 막는다. 단, 행 포커스 매칭은 `href`의 `focus=` 원본 id(예: `w.id`)를 사용한다(`id` 필드의 접두사와 무관).

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run src/components/search/searchFilter.test.ts`
Expected: PASS (8 assertions)

- [ ] **Step 5: 커밋(사용자 지시 시)**

```bash
git add src/components/search/searchFilter.ts src/components/search/searchFilter.test.ts
git commit -m "Feat: 검색 팔레트 순수 필터·스코프 소스 분리 + 단위테스트"
```

---

## Task 2: CommandPalette — lazy fetch + 빈검색 시 목록 미표시

**Files:**
- Modify(전면 교체): `src/components/search/CommandPalette.tsx`

**Interfaces:**
- Consumes: `searchFilter.ts`의 `ScopeKey`, `ScopeItem`, `SCOPE_SOURCES`, `matchesQuery`, `filterAndCap`.
- Props 불변: `{ open: boolean; onOpenChange: (open: boolean) => void }` (SiteHeader 호출부 변경 없음).

- [ ] **Step 1: 파일 전면 교체** — `src/components/search/CommandPalette.tsx`

```tsx
'use client';

// 전역 검색 커맨드 팔레트 — 헤더 검색바 클릭(또는 Cmd/Ctrl+K)으로 가운데 팝업.
// 동작: ① 루트에서 "빠른 액션"으로 사이드바 메뉴 노출 → ② 메뉴 클릭 시 즉시 이동하지 않고
//       "그 메뉴 안에서 검색" 스코프 모드 진입(칩 + 뒤로가기 "<" + "{메뉴}에서 검색…").
//       ③ 스코프 안에서는 검색어를 입력해야 결과가 뜬다(빈 검색=목록 미표시, "페이지 열기"만).
// 성능: 사전 prefetch 없이 스코프 진입 시 해당 데이터만 1회 lazy fetch. cmdk 자동필터 대신
//       수동필터+상한(MAX_RESULTS)으로 매칭 상위 N개만 렌더(큰 목록 렉 방지).

import { Command } from 'cmdk';
import { useState, useCallback, useMemo, type KeyboardEvent } from 'react';
import { useRouter } from 'next/navigation';
import {
  Home, TrendingUp, FileText, Wallet, Music, Briefcase, Users,
  PenSquare, Disc, Disc3, Receipt, Settings, ChevronLeft, CornerDownRight,
  type LucideIcon,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import {
  type ScopeKey, type ScopeItem, SCOPE_SOURCES, matchesQuery, filterAndCap,
} from './searchFilter';

const MAX_RESULTS = 50; // 스코프 검색 결과 렌더 상한

// 권한: all=전체, staff=ADMIN·STAFF, admin=ADMIN (사이드바 NAV_ITEMS와 동일 기준)
type Perm = 'all' | 'staff' | 'admin';
interface Scope { key: ScopeKey; label: string; icon: LucideIcon; href: string; perm: Perm }

// 사이드바(AppSidebar) 메뉴 순서를 그대로 따른 스코프 레지스트리(단일 진실원천)
const SCOPES: Scope[] = [
  { key: 'home', label: '홈 피드', icon: Home, href: '/', perm: 'all' },
  { key: 'revenue', label: '매출현황', icon: TrendingUp, href: '/revenue', perm: 'staff' },
  { key: 'invoices', label: '거래처 청구서', icon: FileText, href: '/invoices', perm: 'staff' },
  { key: 'payouts', label: '내부 지급서', icon: Wallet, href: '/payouts', perm: 'staff' },
  { key: 'royalty', label: '저작권료 정산', icon: Music, href: '/settlement/royalty', perm: 'all' },
  { key: 'service', label: '용역 정산', icon: Briefcase, href: '/settlement/service', perm: 'all' },
  { key: 'staff', label: '구성원', icon: Users, href: '/staff', perm: 'all' },
  { key: 'writers', label: '작가 마스터', icon: PenSquare, href: '/admin/writers', perm: 'staff' },
  { key: 'permWorks', label: '영구 저작물 DB', icon: Disc, href: '/admin/works/permanent', perm: 'staff' },
  { key: 'genWorks', label: '일반 저작물 DB', icon: Disc3, href: '/admin/works/general', perm: 'staff' },
  { key: 'price', label: '프라이스 테이블', icon: Receipt, href: '/admin/price-table', perm: 'staff' },
  { key: 'accounts', label: '관리자용', icon: Settings, href: '/admin/accounts', perm: 'admin' },
];

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const router = useRouter();
  const { user } = useAuthStore();
  const [search, setSearch] = useState('');
  const [scope, setScope] = useState<ScopeKey | null>(null); // null=루트(빠른 액션)
  const [cache, setCache] = useState<Partial<Record<ScopeKey, ScopeItem[]>>>({});
  const [loadingScope, setLoadingScope] = useState<ScopeKey | null>(null);

  // 권한 필터 (사이드바 visibleItems와 동일 기준)
  const canSee = useCallback(
    (perm: Perm) => {
      if (perm === 'all') return true;
      if (perm === 'staff') return user?.role === 'ADMIN' || user?.role === 'STAFF';
      return user?.role === 'ADMIN';
    },
    [user?.role]
  );

  const visibleScopes = useMemo(() => SCOPES.filter((s) => canSee(s.perm)), [canSee]);
  const activeScope = scope ? SCOPES.find((s) => s.key === scope) ?? null : null;
  const ActiveIcon = activeScope?.icon;

  // 닫힐 때 검색어·스코프 초기화
  const handleOpenChange = (next: boolean) => {
    if (!next) { setSearch(''); setScope(null); }
    onOpenChange(next);
  };

  const go = (path: string) => { handleOpenChange(false); router.push(path); };

  // 스코프 진입 — 검색어 비우고, 검색가능 스코프면 캐시에 없을 때 1회 lazy fetch
  const enterScope = (key: ScopeKey) => {
    setScope(key);
    setSearch('');
    const source = SCOPE_SOURCES[key];
    if (!source || cache[key]) return;
    setLoadingScope(key);
    (async () => {
      let items: ScopeItem[] = [];
      try {
        const res = await fetch(source.url);
        if (res.ok) {
          const json = (await res.json()) as Record<string, unknown>;
          items = source.toItems((json[source.jsonKey] as unknown[]) ?? []);
        }
      } catch {
        items = []; // 권한 없는 스코프(403) 등은 빈 결과로 흡수
      }
      setCache((prev) => ({ ...prev, [key]: items }));
      setLoadingScope((cur) => (cur === key ? null : cur));
    })();
  };

  const exitScope = () => { setScope(null); setSearch(''); };

  // 빈 입력에서 Backspace → 루트로 복귀
  const handleInputKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && search === '' && scope) { e.preventDefault(); exitScope(); }
  };

  // 루트 빠른액션 — 권한 + 검색 수동필터(빈 검색이면 전체)
  const rootActions = useMemo(
    () => visibleScopes.filter((s) => matchesQuery(`${s.label} ${s.key}`, search)),
    [visibleScopes, search]
  );

  // 스코프 검색 결과 — 검색어가 있을 때만(빈 검색=목록 미표시) + 상한
  const scopeResults = useMemo(() => {
    if (!scope || search.trim() === '') return [];
    return filterAndCap(cache[scope] ?? [], search, MAX_RESULTS);
  }, [scope, search, cache]);

  const showScopeData = scope !== null && !!SCOPE_SOURCES[scope] && search.trim() !== '';

  return (
    <Command.Dialog
      open={open}
      onOpenChange={handleOpenChange}
      label="전체 검색"
      shouldFilter={false}
    >
      <div className="flex items-center gap-2 px-4 border-b border-border">
        {activeScope ? (
          <>
            <button
              type="button"
              onClick={exitScope}
              aria-label="빠른 액션으로 돌아가기"
              className="flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-full bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/70 transition cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="flex-shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium whitespace-nowrap">
              {ActiveIcon && <ActiveIcon className="w-3 h-3" />}
              {activeScope.label}
            </span>
          </>
        ) : (
          <span className="text-primary text-lg">⚡</span>
        )}
        <Command.Input
          value={search}
          onValueChange={setSearch}
          onKeyDown={handleInputKeyDown}
          placeholder={activeScope ? `${activeScope.label}에서 검색…` : '검색어 입력'}
        />
      </div>

      <Command.List className="gradient-scroll">
        {scope === null ? (
          // ── 루트: 빠른 액션(권한 + 수동필터) ──
          rootActions.length === 0 ? (
            <div className="px-4 py-3 text-xs text-muted-foreground">일치하는 메뉴가 없습니다.</div>
          ) : (
            <Command.Group heading="빠른 액션">
              {rootActions.map((s) => {
                const Icon = s.icon;
                return (
                  <Command.Item key={s.key} value={s.key} onSelect={() => enterScope(s.key)}>
                    <Icon className="h-4 w-4 opacity-70" />
                    <span className="flex-1">{s.label}</span>
                  </Command.Item>
                );
              })}
            </Command.Group>
          )
        ) : (
          // ── 스코프 모드: "페이지 열기"는 항상, 데이터는 검색 시에만 ──
          <>
            <Command.Group heading="바로가기">
              <Command.Item value="__open__" onSelect={() => activeScope && go(activeScope.href)}>
                <CornerDownRight className="h-4 w-4 opacity-70" />
                <span className="flex-1">{activeScope?.label} 페이지 열기</span>
              </Command.Item>
            </Command.Group>

            {showScopeData && (
              loadingScope === scope ? (
                <div className="px-4 py-3 text-xs text-muted-foreground">불러오는 중…</div>
              ) : scopeResults.length === 0 ? (
                <div className="px-4 py-3 text-xs text-muted-foreground">검색 결과가 없습니다.</div>
              ) : (
                <Command.Group heading="검색 결과">
                  {scopeResults.map((it) => (
                    <Command.Item key={it.id} value={it.id} onSelect={() => go(it.href)}>
                      {ActiveIcon && <ActiveIcon className="h-4 w-4 opacity-70" />}
                      <span className="flex-1 truncate">{it.primary}</span>
                      {it.secondary && (
                        <span className="text-xs text-muted-foreground truncate">{it.secondary}</span>
                      )}
                    </Command.Item>
                  ))}
                </Command.Group>
              )
            )}
          </>
        )}
      </Command.List>
    </Command.Dialog>
  );
}
```

- [ ] **Step 2: 타입·린트 확인**

Run: `npm run type-check && npx eslint src/components/search/CommandPalette.tsx`
Expected: 출력 없음(에러 0)

- [ ] **Step 3: Playwright 동작 검증** — dev(3001) 인증 세션

확인 항목:
1. 검색바 열기 → 루트에 빠른 액션 전체 노출.
2. "작가 마스터" 클릭 → 스코프 진입. **이때 작가 목록이 뜨지 않고** "작가 마스터 페이지 열기"만 보인다.
3. "박" 입력 → "검색 결과" 그룹에 박서준 등만 노출.
4. 검색어 지우면 다시 목록이 사라지고 "페이지 열기"만 남는다.
5. 콘솔 에러 0(`browser_console_messages` level error).

- [ ] **Step 4: 커밋(사용자 지시 시)**

```bash
git add src/components/search/CommandPalette.tsx
git commit -m "Feat: 검색 스코프 lazy fetch + 빈검색 시 목록 미표시(검색 시에만 결과)"
```

---

## Task 3: 공용 행 포커스 훅 + 하이라이트 CSS

**Files:**
- Create: `src/hooks/useRowFocus.ts`
- Modify: `src/app/globals.css` (키프레임 추가)

**Interfaces:**
- Produces: `useRowFocus(ready: boolean): void` — URL `?focus=<id>`를 읽어 `id="row-<id>"` 요소로 스크롤 + `.row-focus-highlight` 부여(2.2s 후 제거). `ready`(데이터 로드 완료)가 true가 되는 시점에 1회 실행.

- [ ] **Step 1: 훅 작성** — `src/hooks/useRowFocus.ts`

```ts
'use client';

// 검색으로 진입한 표 행으로 스크롤 + 잠깐 하이라이트(마우스 호버 느낌).
// URL ?focus=<id> 를 읽어 id={`row-<id>`} 요소를 찾는다. ready(데이터 로드 완료) 시 1회 실행.
// useSearchParams 대신 window.location.search 사용 → App Router의 Suspense 경계 요구 회피.

import { useEffect } from 'react';

export function useRowFocus(ready: boolean): void {
  useEffect(() => {
    if (!ready) return;
    const focusId = new URLSearchParams(window.location.search).get('focus');
    if (!focusId) return;
    const el = document.getElementById(`row-${focusId}`);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.classList.add('row-focus-highlight');
    const timer = window.setTimeout(() => el.classList.remove('row-focus-highlight'), 2200);
    return () => window.clearTimeout(timer);
  }, [ready]);
}
```

- [ ] **Step 2: 하이라이트 CSS 추가** — `src/app/globals.css` 맨 끝에 추가

```css
/* 검색 진입 행 하이라이트 — primary 틴트로 번쩍였다 사라짐(호버 느낌) */
@keyframes rowFocusPulse {
  0% { background-color: color-mix(in oklch, var(--primary) 22%, transparent); }
  100% { background-color: transparent; }
}
.row-focus-highlight {
  animation: rowFocusPulse 2.2s ease-out forwards;
}
```

- [ ] **Step 3: 타입·린트 확인**

Run: `npm run type-check && npx eslint src/hooks/useRowFocus.ts`
Expected: 출력 없음(에러 0)

- [ ] **Step 4: 커밋(사용자 지시 시)**

```bash
git add src/hooks/useRowFocus.ts src/app/globals.css
git commit -m "Feat: 검색 결과 행 스크롤+하이라이트 공용 훅·CSS"
```

---

## Task 4: 작가 마스터 페이지 행 포커스

**Files:**
- Modify: `src/app/(dashboard)/admin/writers/page.tsx`

- [ ] **Step 1: import 추가** — 기존 import 블록(`SortableHeader` 줄 아래)에 추가

```tsx
import { useRowFocus } from '@/hooks/useRowFocus';
```

- [ ] **Step 2: 훅 호출 추가** — `filtered` useMemo(현재 419~424행) 바로 아래에 추가

```tsx
  // 검색으로 진입 시 해당 작가 행으로 스크롤 + 하이라이트
  useRowFocus(!isLoading && filtered.length > 0);
```

- [ ] **Step 3: 행에 id 부여** — 현재 608~609행

변경 전:
```tsx
                {filtered.map((w) => (
                  <tr key={w.id} className="hover:bg-primary/5">
```
변경 후:
```tsx
                {filtered.map((w) => (
                  <tr key={w.id} id={`row-${w.id}`} className="hover:bg-primary/5">
```

- [ ] **Step 4: 타입·린트 확인**

Run: `npm run type-check && npx eslint "src/app/(dashboard)/admin/writers/page.tsx"`
Expected: 출력 없음(에러 0)

- [ ] **Step 5: Playwright 검증** — 검색바에서 작가 마스터 → "박서준" → 선택. URL이 `/admin/writers?focus=<id>`가 되고 해당 행이 화면 중앙으로 스크롤 + 잠깐 하이라이트되는지 확인.

- [ ] **Step 6: 커밋(사용자 지시 시)**

```bash
git add "src/app/(dashboard)/admin/writers/page.tsx"
git commit -m "Feat: 작가 마스터 검색 진입 행 포커스"
```

---

## Task 5: 구성원 페이지 행 포커스

**Files:**
- Modify: `src/app/(dashboard)/staff/page.tsx`

> 주의: 팔레트는 `user_id`로 포커스한다(행 `key`는 `m.id`이지만 매칭 id는 `m.user_id`). 따라서 `id="row-<user_id>"`로 부여한다.

- [ ] **Step 1: import 추가**

```tsx
import { useRowFocus } from '@/hooks/useRowFocus';
```

- [ ] **Step 2: 훅 호출 추가** — `filtered` useMemo(현재 197~202행) 바로 아래에 추가

```tsx
  // 검색으로 진입 시 해당 구성원 행으로 스크롤 + 하이라이트
  useRowFocus(!isLoading && filtered.length > 0);
```

- [ ] **Step 3: 행에 id 부여** — 현재 258~259행

변경 전:
```tsx
                {filtered.map((m) => (
                  <tr key={m.id} className="hover:bg-primary/5">
```
변경 후:
```tsx
                {filtered.map((m) => (
                  <tr key={m.id} id={`row-${m.user_id}`} className="hover:bg-primary/5">
```

- [ ] **Step 4: 타입·린트 확인**

Run: `npm run type-check && npx eslint "src/app/(dashboard)/staff/page.tsx"`
Expected: 출력 없음(에러 0)

- [ ] **Step 5: Playwright 검증** — 검색바 → 구성원 → 이름 검색 → 선택 → `/staff?focus=<user_id>`에서 해당 행 스크롤+하이라이트.

- [ ] **Step 6: 커밋(사용자 지시 시)**

```bash
git add "src/app/(dashboard)/staff/page.tsx"
git commit -m "Feat: 구성원 검색 진입 행 포커스"
```

---

## Task 6: 프라이스 테이블 페이지 행 포커스

**Files:**
- Modify: `src/app/(dashboard)/admin/price-table/page.tsx`

- [ ] **Step 1: import 추가**

```tsx
import { useRowFocus } from '@/hooks/useRowFocus';
```

- [ ] **Step 2: 훅 호출 추가** — 컴포넌트 본문에서 `items`·`isLoading`이 선언된 이후, `return (` 직전에 추가

```tsx
  // 검색으로 진입 시 해당 프라이스 항목 행으로 스크롤 + 하이라이트
  useRowFocus(!isLoading && items.length > 0);
```

- [ ] **Step 3: 행에 id 부여** — 현재 442행

변경 전:
```tsx
                    <tr key={it.id} className={`group hover:bg-primary/5 ${!it.is_active && !viewTrash ? 'opacity-40' : ''} ${selected.has(it.id) ? 'bg-primary/5' : ''}`}>
```
변경 후:
```tsx
                    <tr key={it.id} id={`row-${it.id}`} className={`group hover:bg-primary/5 ${!it.is_active && !viewTrash ? 'opacity-40' : ''} ${selected.has(it.id) ? 'bg-primary/5' : ''}`}>
```

- [ ] **Step 4: 타입·린트 확인**

Run: `npm run type-check && npx eslint "src/app/(dashboard)/admin/price-table/page.tsx"`
Expected: 출력 없음(에러 0)

- [ ] **Step 5: Playwright 검증** — 검색바 → 프라이스 테이블 → 항목명 검색 → 선택 → `/admin/price-table?focus=<id>`에서 해당 행 스크롤+하이라이트.

- [ ] **Step 6: 커밋(사용자 지시 시)**

```bash
git add "src/app/(dashboard)/admin/price-table/page.tsx"
git commit -m "Feat: 프라이스 테이블 검색 진입 행 포커스"
```

---

## Task 7: 영구 저작물 DB 페이지 행 포커스(+`?writer` 자동선택)

**Files:**
- Modify: `src/app/(dashboard)/admin/works/permanent/page.tsx`

> 이 페이지는 기본 "전체보기"가 20개씩 페이지네이션이라 대상 행이 미로드일 수 있다. 팔레트가 보내는 `?writer=<name>`을 마운트 시 읽어 해당 작가를 선택하면 그 작가의 전 행이 로드되어 포커스가 가능해진다.

- [ ] **Step 1: import 추가**

```tsx
import { useRowFocus } from '@/hooks/useRowFocus';
```

- [ ] **Step 2: `selectedWriter` 초기값을 URL에서 lazy 로드** — 현재 41행

변경 전:
```tsx
  const [selectedWriter, setSelectedWriter] = useState<string | null>(null); // null = 전체보기
```
변경 후:
```tsx
  // null = 전체보기. 검색으로 진입(?writer=)하면 해당 작가를 선택해 그 작가의 전 행을 로드한다.
  const [selectedWriter, setSelectedWriter] = useState<string | null>(
    () => (typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('writer') : null)
  );
```

- [ ] **Step 3: 훅 호출 추가** — `sorted` useMemo(현재 181행) 바로 아래에 추가

```tsx
  // 검색으로 진입 시 해당 저작물 행으로 스크롤 + 하이라이트
  useRowFocus(!isLoading && works.length > 0);
```

- [ ] **Step 4: 행에 id 부여** — 현재 379~384행

변경 전:
```tsx
                    {sorted.map((w) => (
                      <tr
                        key={w.id}
                        className="hover:bg-primary/5 text-center text-foreground"
```
변경 후:
```tsx
                    {sorted.map((w) => (
                      <tr
                        key={w.id}
                        id={`row-${w.id}`}
                        className="hover:bg-primary/5 text-center text-foreground"
```

- [ ] **Step 5: 타입·린트 확인**

Run: `npm run type-check && npx eslint "src/app/(dashboard)/admin/works/permanent/page.tsx"`
Expected: 출력 없음(에러 0)

- [ ] **Step 6: Playwright 검증** — 검색바 → 영구 저작물 DB → 곡명/작가 검색 → 선택 → `/admin/works/permanent?writer=<name>&focus=<id>`. 좌측에서 해당 작가가 선택되고 그 행으로 스크롤+하이라이트되는지 확인.

- [ ] **Step 7: 커밋(사용자 지시 시)**

```bash
git add "src/app/(dashboard)/admin/works/permanent/page.tsx"
git commit -m "Feat: 영구 저작물 검색 진입 행 포커스(작가 자동선택)"
```

---

## Task 8: 통합 검증

**Files:** (변경 없음 — 전체 검증)

- [ ] **Step 1: 정적 검사 + 단위테스트 전체**

Run:
```bash
npm run type-check
npx eslint src/
npx vitest run
```
Expected: 모두 에러 0 / vitest 통과.

- [ ] **Step 2: 프로덕션 빌드**

Run: `npm run build`
Expected: 빌드 성공(타입/린트 에러 없음).

- [ ] **Step 3: Playwright 시나리오(인증 세션, 포트 3001)**

각 스코프에 대해:
1. 검색바 열기 → 스코프 진입 시 **목록 미표시**(바로가기만).
2. 검색어 입력 → "검색 결과"에 매칭 항목만.
3. 항목 선택 → 대상 페이지로 이동.
   - 표 페이지(작가/구성원/프라이스/영구저작물): 해당 **행으로 스크롤 + 하이라이트**.
   - 상세 페이지(거래처 청구서/내부 지급서/용역 정산): 항목 상세가 화면에 노출(추가 포커스 불필요).
4. 콘솔 에러 0.

- [ ] **Step 4: 커밋(사용자 지시 시)** — 잔여 변경이 있으면 정리 커밋.

---

## Self-Review

**1. Spec coverage**
- (A) 스코프 진입 시 목록 미표시 → Task 2 `showScopeData = ... && search.trim() !== ''`. ✓
- (B) 스코프 내 검색으로 찾기 → Task 1 `matchesQuery`/`filterAndCap` + Task 2 `scopeResults`. ✓
- (C) 결과 진입 시 해당 위치 노출/행 하이라이트 → Task 3 훅·CSS + Task 4~7 페이지 적용. 상세이동 스코프는 자동 충족(명시). ✓
- 성능(목록 미리 로딩 렉) → 사전 prefetch 제거 + 스코프 lazy fetch + 수동필터 상한(MAX_RESULTS). 서버사이드 검색은 데이터 소량으로 YAGNI(SCOPE_SOURCES.url이 후일 전환점). ✓

**2. Placeholder scan** — 모든 코드 스텝에 실제 코드/명령/기대출력 포함. "TODO/적절히 처리" 없음. ✓

**3. Type consistency**
- `ScopeItem`/`ScopeKey`/`ScopeSource`는 Task 1에서 정의, Task 2가 동일 시그니처로 소비. ✓
- `useRowFocus(ready: boolean)` 시그니처가 Task 3 정의 = Task 4~7 호출과 일치. ✓
- 행 매칭 id 규약: `id="row-<원본id>"` ↔ `href`의 `focus=<원본id>`. writers=`w.id`, staff=`m.user_id`(행 key와 다름에 유의), price=`it.id`, permWorks=`w.id`. 각 Task에 명시. ✓

**알려진 한계(문서화):** 동일 라우트에서 쿼리만 바뀌는 재포커스는 `ready` 토글이 없으면 재실행되지 않을 수 있다. 대부분 새 라우트 진입이라 v1 허용. 필요 시 `useRowFocus`에 focus 값 변화 감지를 추가.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-06-18-search-scope-lazy-and-focus.md`. Two execution options:

1. **Subagent-Driven (recommended)** — 태스크마다 새 서브에이전트 디스패치, 태스크 사이 리뷰, 빠른 반복.
2. **Inline Execution** — 이 세션에서 executing-plans로 체크포인트 배치 실행.

Which approach?
