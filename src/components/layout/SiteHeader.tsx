'use client';

import { usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';
import { useMemo, useState } from 'react';

interface SiteHeaderProps {
  onMenuClick?: () => void;
}

const pageLabels: Record<string, string> = {
  '/': 'Home',
  '/settlement': 'Settlement',
  '/writers': 'Writers',
  '/staff': 'Staff',
  '/revenue': 'Revenue',
  '/admin/accounts': 'Accounts',
  '/writer-portal': 'Writer Portal',
};

export function SiteHeader({ onMenuClick }: SiteHeaderProps) {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [searchValue, setSearchValue] = useState('');

  const pageTitle = useMemo(() => pageLabels[pathname] || 'Page', [pathname]);

  const nextTheme = useMemo(() => {
    const themes = ['light', 'dark', 'classic-dark'];
    const currentIndex = themes.indexOf(theme || 'dark');
    return themes[(currentIndex + 1) % themes.length];
  }, [theme]);

  const getThemeIcon = (t?: string) => {
    switch (t) {
      case 'light':
        return '☀️';
      case 'classic-dark':
        return '🖤';
      default:
        return '🌙';
    }
  };

  return (
    <header className="flex items-center justify-between gap-4 px-6 py-4 bg-background border-b border-border sticky top-0 z-10">
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
          <span className="text-muted-foreground">Dashboard</span>
          <span className="text-muted-foreground">/</span>
          <span className="text-foreground font-medium">{pageTitle}</span>
        </div>
      </div>

      {/* 오른쪽: 검색 + 아이콘들 */}
      <div className="flex items-center gap-3">
        {/* 검색 입력창 */}
        <div className="hidden lg:flex items-center gap-2 px-3 py-2 bg-card border border-border rounded-lg">
          <span className="text-muted-foreground">🔍</span>
          <input
            type="text"
            placeholder="Search..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            className="bg-transparent text-foreground text-sm placeholder-muted-foreground outline-none w-48"
          />
          <span className="text-xs text-muted-foreground">⌘K</span>
        </div>

        {/* 테마 토글 */}
        <button
          onClick={() => setTheme(nextTheme)}
          className="p-2 rounded-lg hover:bg-blue-600/10 text-foreground transition"
          title={`테마: ${theme}`}
        >
          {getThemeIcon(theme)}
        </button>

        {/* 설정 아이콘 */}
        <button className="p-2 rounded-lg hover:bg-blue-600/10 text-foreground transition" title="설정">
          ⚙️
        </button>

        {/* 알림 아이콘 */}
        <button className="relative p-2 rounded-lg hover:bg-blue-600/10 text-foreground transition" title="알림">
          🔔
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
        </button>
      </div>
    </header>
  );
}
