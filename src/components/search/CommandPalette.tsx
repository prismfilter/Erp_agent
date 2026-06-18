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
  PenSquare, Building2, Disc, Disc3, Receipt, Settings, ChevronLeft, CornerDownRight,
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
  { key: 'clients', label: '거래처 DB', icon: Building2, href: '/admin/clients', perm: 'staff' },
  { key: 'permWorks', label: '영구 저작물 DB', icon: Disc, href: '/admin/works/permanent', perm: 'staff' },
  { key: 'genWorks', label: '일반 저작물 DB', icon: Disc3, href: '/admin/works/general', perm: 'staff' },
  { key: 'price', label: '용역 단가', icon: Receipt, href: '/admin/price-table', perm: 'staff' },
  { key: 'staff', label: '구성원', icon: Users, href: '/staff', perm: 'all' },
  { key: 'writers', label: '작가 마스터', icon: PenSquare, href: '/admin/writers', perm: 'staff' },
  { key: 'accounts', label: '계정 관리', icon: Settings, href: '/admin/accounts', perm: 'admin' },
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
