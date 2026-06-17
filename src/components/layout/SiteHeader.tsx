'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { CommandPalette } from '@/components/search/CommandPalette';

interface SiteHeaderProps {
  onMenuClick?: () => void;
}

// 정적 라우트 → 표시명 (브레드크럼). 신규 페이지 추가 시 이 맵에도 등록할 것.
const PAGE_LABELS: Record<string, string> = {
  '/': '홈 피드',
  '/revenue': '매출현황',
  '/invoices': '거래처 청구서',
  '/invoices/new': '청구서 작성',
  '/payouts': '내부 지급서',
  '/settlement/royalty': '저작권료 정산',
  '/settlement/service': '용역 정산',
  '/staff': '구성원',
  '/writer-portal': '작가 포털',
  '/profile': '내 프로필 설정',
  '/admin/writers': '작가 마스터',
  '/admin/works': '저작물 DB',
  '/admin/works/permanent': '영구 저작물 DB',
  '/admin/works/general': '일반 저작물 DB',
  '/admin/price-table': '프라이스 테이블',
  '/admin/accounts': '관리자용',
};

// 동적 라우트(상세·수정 등) — 위에서부터 우선 매칭(더 구체적인 패턴 먼저)
const DYNAMIC_LABELS: ReadonlyArray<readonly [RegExp, string]> = [
  [/^\/invoices\/[^/]+\/edit$/, '청구서 수정'],
  [/^\/invoices\/[^/]+$/, '청구서 상세'],
  [/^\/settlement\/service\/[^/]+$/, '용역 정산 상세'],
];

function getPageTitle(pathname: string): string {
  const exact = PAGE_LABELS[pathname];
  if (exact) return exact;
  for (const [pattern, label] of DYNAMIC_LABELS) {
    if (pattern.test(pathname)) return label;
  }
  return '페이지';
}

export function SiteHeader({ onMenuClick }: SiteHeaderProps) {
  const pathname = usePathname();
  const [searchOpen, setSearchOpen] = useState(false);

  const pageTitle = useMemo(() => getPageTitle(pathname), [pathname]);

  // Cmd/Ctrl + K 로 검색 팔레트 토글
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setSearchOpen((v) => !v);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  return (
    <header className="flex h-16 items-center justify-between gap-4 px-6 bg-background border-b border-border sticky top-0 z-10">
      {/* 왼쪽: 메뉴 + 브레드크럼 */}
      <div className="flex items-center gap-4 flex-1">
        <button
          onClick={onMenuClick}
          className="md:hidden p-1 rounded hover:bg-blue-600/10 text-foreground"
          aria-label="메뉴 열기"
        >
          ☰
        </button>

        {/* 브레드크럼 */}
        <div className="hidden md:flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">PRISMFILTER MUSIC GROUP</span>
          <span className="text-muted-foreground">/</span>
          <span className="text-foreground font-medium">{pageTitle}</span>
        </div>
      </div>

      {/* 오른쪽: 검색 + 아이콘들 */}
      <div className="flex items-center gap-3">
        {/* 검색 — 클릭 시 커맨드 팔레트 오픈 */}
        <button
          type="button"
          onClick={() => setSearchOpen(true)}
          className="hidden lg:flex items-center gap-2 px-3 py-2 bg-card border border-border rounded-lg text-sm text-muted-foreground hover:border-primary/50 transition cursor-pointer w-64"
          aria-label="검색 열기"
        >
          <span>🔍</span>
          <span className="flex-1 text-left">검색</span>
        </button>

        {/* 알림 아이콘 */}
        <button className="relative p-2 rounded-lg hover:bg-blue-600/10 text-foreground transition" title="알림">
          🔔
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
        </button>

        {/* 설정 아이콘 */}
        <button className="p-2 rounded-lg hover:bg-blue-600/10 text-foreground transition" title="설정">
          ⚙️
        </button>
      </div>

      <CommandPalette open={searchOpen} onOpenChange={setSearchOpen} />
    </header>
  );
}
