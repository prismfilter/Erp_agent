'use client';

// 전역 검색 커맨드 팔레트 — 헤더 검색바 클릭(또는 Cmd/Ctrl+K)으로 가운데 팝업.
// 동작: ① 루트에서 "빠른 액션"으로 사이드바 메뉴를 노출 → ② 메뉴 클릭 시 즉시 이동하지 않고
//       "그 메뉴 안에서 검색" 스코프 모드로 진입(칩 + 뒤로가기 "<" + "{메뉴}에서 검색…").
//       ③ 스코프 안에서는 해당 메뉴의 실데이터만 cmdk 자동필터로 검색해 상세로 이동.
// cmdk가 입력값으로 자동 필터링/정렬/키보드 내비게이션을 처리한다.

import { Command } from 'cmdk';
import { useEffect, useState, useCallback, useMemo, type KeyboardEvent } from 'react';
import { useRouter } from 'next/navigation';
import {
  Home,
  TrendingUp,
  FileText,
  Wallet,
  Music,
  Briefcase,
  Users,
  PenSquare,
  Disc,
  Disc3,
  Receipt,
  Settings,
  ChevronLeft,
  CornerDownRight,
  type LucideIcon,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { formatWon } from '@/lib/settlement/calculator';

interface InvoiceLite {
  id: string;
  title: string;
  client?: { name?: string | null } | null;
}
interface SettlementLite {
  id: string;
  writer_name: string;
  period_start: string;
  period_end: string;
  total_amount: number;
}
interface WriterLite {
  id: string;
  name: string;
  writer_type: string;
}
interface MemberLite {
  user_id: string;
  name: string | null;
  role: string;
}
interface WorkLite {
  id: string;
  no: number;
  writer_name: string;
  song_title: string;
  komca_code: string | null;
  artist: string | null;
}
interface PriceLite {
  id: string;
  category: string;
  name: string;
}

// 빠른 액션 = 스코프. key로 데이터 소스를 분기한다.
type ScopeKey =
  | 'home'
  | 'revenue'
  | 'invoices'
  | 'payouts'
  | 'royalty'
  | 'service'
  | 'staff'
  | 'writers'
  | 'permWorks'
  | 'genWorks'
  | 'price'
  | 'accounts';

// 권한: all=전체, staff=ADMIN·STAFF, admin=ADMIN (사이드바 NAV_ITEMS와 동일 기준)
type Perm = 'all' | 'staff' | 'admin';

interface Scope {
  key: ScopeKey;
  label: string;
  icon: LucideIcon;
  href: string; // "페이지 열기" 및 데이터 없는 스코프의 이동 대상
  perm: Perm;
}

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

async function safeFetch<T>(url: string, key: string): Promise<T[]> {
  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const json = await res.json();
    return (json[key] as T[]) ?? [];
  } catch {
    return [];
  }
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const router = useRouter();
  const { user } = useAuthStore();
  const [search, setSearch] = useState('');
  const [scope, setScope] = useState<ScopeKey | null>(null); // null=루트(빠른 액션)
  const [loaded, setLoaded] = useState(false);
  const [invoices, setInvoices] = useState<InvoiceLite[]>([]);
  const [settlements, setSettlements] = useState<SettlementLite[]>([]);
  const [writers, setWriters] = useState<WriterLite[]>([]);
  const [members, setMembers] = useState<MemberLite[]>([]);
  const [works, setWorks] = useState<WorkLite[]>([]);
  const [priceItems, setPriceItems] = useState<PriceLite[]>([]);

  // 열릴 때 1회 데이터 로드 (소량 데이터셋 → 클라이언트 필터)
  // 권한 없는 사용자는 staffOnly API가 403 → safeFetch가 []로 흡수하므로 안전.
  // works는 limit 최대 100 — 164건 중 100건만 검색 대상(v1 한계).
  useEffect(() => {
    if (!open || loaded) return;
    (async () => {
      const [inv, set, wr, mem, wk, pr] = await Promise.all([
        safeFetch<InvoiceLite>('/api/invoices', 'invoices'),
        safeFetch<SettlementLite>('/api/settlements/service', 'settlements'),
        safeFetch<WriterLite>('/api/writers', 'writers'),
        safeFetch<MemberLite>('/api/admin/users', 'users'),
        safeFetch<WorkLite>('/api/works?limit=100', 'works'),
        safeFetch<PriceLite>('/api/price-items?all=1', 'priceItems'),
      ]);
      setInvoices(inv);
      setSettlements(set);
      setWriters(wr);
      setMembers(mem);
      setWorks(wk);
      setPriceItems(pr);
      setLoaded(true);
    })();
  }, [open, loaded]);

  // 열림 상태 변경 — 닫힐 때 검색어·스코프 초기화 (effect 아님 → setState-in-effect 회피)
  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setSearch('');
      setScope(null);
    }
    onOpenChange(next);
  };

  const go = (path: string) => {
    handleOpenChange(false);
    router.push(path);
  };

  // 스코프 진입/이탈 — 진입·이탈 시 항상 검색어를 비워 이전 입력 잔류 방지
  const enterScope = (key: ScopeKey) => {
    setScope(key);
    setSearch('');
  };
  const exitScope = () => {
    setScope(null);
    setSearch('');
  };

  // 빈 입력에서 Backspace → 루트로 복귀 (cmdk pages 표준 UX)
  const handleInputKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && search === '' && scope) {
      e.preventDefault();
      exitScope();
    }
  };

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

  // 스코프 모드의 데이터 결과 — key별 분기. 데이터 없는 스코프는 null("페이지 열기"만 노출).
  const renderScopeData = () => {
    switch (scope) {
      case 'invoices':
        return (
          <Command.Group heading="청구서">
            {invoices.map((i) => (
              <Command.Item
                key={`inv-${i.id}`}
                value={`${i.title} ${i.client?.name ?? ''}`}
                onSelect={() => go(`/invoices/${i.id}`)}
              >
                <FileText className="h-4 w-4 opacity-70" />
                <span className="flex-1 truncate">{i.title}</span>
                {i.client?.name && (
                  <span className="text-xs text-muted-foreground">{i.client.name}</span>
                )}
              </Command.Item>
            ))}
          </Command.Group>
        );
      case 'payouts':
        return (
          <Command.Group heading="내부 지급서">
            {invoices.map((i) => (
              <Command.Item
                key={`pay-${i.id}`}
                value={`${i.title} ${i.client?.name ?? ''}`}
                onSelect={() => go(`/invoices/${i.id}?tab=internal`)}
              >
                <Wallet className="h-4 w-4 opacity-70" />
                <span className="flex-1 truncate">{i.title}</span>
                {i.client?.name && (
                  <span className="text-xs text-muted-foreground">{i.client.name}</span>
                )}
              </Command.Item>
            ))}
          </Command.Group>
        );
      case 'service':
        return (
          <Command.Group heading="용역 정산">
            {settlements.map((s) => (
              <Command.Item
                key={`set-${s.id}`}
                value={`${s.writer_name}`}
                onSelect={() => go(`/settlement/service/${s.id}`)}
              >
                <Briefcase className="h-4 w-4 opacity-70" />
                <span className="flex-1 truncate">{s.writer_name}</span>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {s.period_start}~{s.period_end} · {formatWon(s.total_amount)}
                </span>
              </Command.Item>
            ))}
          </Command.Group>
        );
      case 'writers':
        return (
          <Command.Group heading="작가">
            {writers.map((w) => (
              <Command.Item
                key={`wr-${w.id}`}
                value={`${w.name} ${w.writer_type}`}
                onSelect={() => go('/admin/writers')}
              >
                <PenSquare className="h-4 w-4 opacity-70" />
                <span className="flex-1 truncate">{w.name}</span>
                <span className="text-xs text-muted-foreground">{w.writer_type}</span>
              </Command.Item>
            ))}
          </Command.Group>
        );
      case 'staff':
        return (
          <Command.Group heading="구성원">
            {members.map((m) => (
              <Command.Item
                key={`mem-${m.user_id}`}
                value={`${m.name ?? ''} ${m.role}`}
                onSelect={() => go('/staff')}
              >
                <Users className="h-4 w-4 opacity-70" />
                <span className="flex-1 truncate">{m.name || '(이름 없음)'}</span>
                <span className="text-xs text-muted-foreground">{m.role}</span>
              </Command.Item>
            ))}
          </Command.Group>
        );
      case 'permWorks':
        return (
          <Command.Group heading="영구 저작물">
            {works.map((w) => (
              <Command.Item
                key={`wk-${w.id}`}
                value={`${w.song_title} ${w.writer_name} ${w.komca_code ?? ''} ${w.artist ?? ''}`}
                onSelect={() => go('/admin/works/permanent')}
              >
                <Disc className="h-4 w-4 opacity-70" />
                <span className="flex-1 truncate">{w.song_title}</span>
                <span className="text-xs text-muted-foreground truncate">
                  {w.writer_name}
                  {w.artist ? ` · ${w.artist}` : ''}
                </span>
              </Command.Item>
            ))}
          </Command.Group>
        );
      case 'price':
        return (
          <Command.Group heading="프라이스 테이블">
            {priceItems.map((p) => (
              <Command.Item
                key={`pr-${p.id}`}
                value={`${p.name} ${p.category}`}
                onSelect={() => go('/admin/price-table')}
              >
                <Receipt className="h-4 w-4 opacity-70" />
                <span className="flex-1 truncate">{p.name}</span>
                <span className="text-xs text-muted-foreground">{p.category}</span>
              </Command.Item>
            ))}
          </Command.Group>
        );
      default:
        // royalty · revenue · genWorks · home · accounts — 검색 데이터 없음
        return null;
    }
  };

  return (
    <Command.Dialog
      open={open}
      onOpenChange={handleOpenChange}
      label="전체 검색"
      shouldFilter
    >
      <div className="flex items-center gap-2 px-4 border-b border-border">
        {activeScope ? (
          // 스코프 모드: 뒤로가기 "<" + 스코프 라벨 칩
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
        <Command.Empty>검색 결과가 없습니다.</Command.Empty>

        {scope === null ? (
          // ── 루트: 빠른 액션(사이드바 메뉴 전체, 권한 필터) → 클릭 시 스코프 진입 ──
          <Command.Group heading="빠른 액션">
            {visibleScopes.map((s) => {
              const Icon = s.icon;
              return (
                <Command.Item
                  key={s.key}
                  value={`${s.label} ${s.key}`}
                  onSelect={() => enterScope(s.key)}
                >
                  <Icon className="h-4 w-4 opacity-70" />
                  <span className="flex-1">{s.label}</span>
                </Command.Item>
              );
            })}
          </Command.Group>
        ) : (
          // ── 스코프 모드: "페이지 열기" + 해당 메뉴 데이터 ──
          <>
            <Command.Group heading="바로가기">
              <Command.Item
                value={`${activeScope?.label} 페이지 열기`}
                onSelect={() => activeScope && go(activeScope.href)}
              >
                <CornerDownRight className="h-4 w-4 opacity-70" />
                <span className="flex-1">{activeScope?.label} 페이지 열기</span>
              </Command.Item>
            </Command.Group>
            {renderScopeData()}
          </>
        )}
      </Command.List>
    </Command.Dialog>
  );
}
