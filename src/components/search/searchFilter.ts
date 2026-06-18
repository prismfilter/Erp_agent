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
