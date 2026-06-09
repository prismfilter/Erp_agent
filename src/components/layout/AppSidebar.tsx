'use client';

import Link from 'next/link';
import { useCallback, useMemo } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { createClient } from '@/lib/supabase/client';
import { useTheme } from 'next-themes';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';

interface NavItem {
  label: string;
  href: string;
  icon: string;
  adminOnly?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { label: '홈 피드', href: '/', icon: '🏠' },
  { label: '직원', href: '/staff', icon: '👥' },
  { label: '전속작가', href: '/writers', icon: '✍️', adminOnly: true },
  { label: '매출현황', href: '/revenue', icon: '📈' },
  { label: '정산서', href: '/settlement', icon: '📄' },
];

export function AppSidebar({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { user } = useAuthStore();

  // 메모이제이션: 로그아웃 핸들러
  const handleLogout = useCallback(async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
  }, [router]);

  // 메모이제이션: 계정관리 이동
  const handleAdminAccounts = useCallback(() => {
    router.push('/admin/accounts');
    onClose?.();
  }, [router, onClose]);

  // 메모이제이션: 테마 변경 (next-themes가 자동으로 쿠키 저장)
  const handleThemeChange = useCallback((newTheme: string) => {
    setTheme(newTheme);
  }, [setTheme]);

  // 메모이제이션: 역할 라벨
  const roleLabel = useMemo(() => {
    switch (user?.role) {
      case 'ADMIN':
        return '👑 관리자';
      case 'STAFF':
        return '💼 직원';
      case 'WRITER':
        return '✍️ 작가';
      default:
        return '사용자';
    }
  }, [user?.role]);

  // 메모이제이션: 표시할 메뉴 아이템
  const visibleItems = useMemo(
    () => NAV_ITEMS.filter((item) => !item.adminOnly || user?.role === 'ADMIN'),
    [user?.role]
  );

  // 메모이제이션: 활성 경로 확인
  const isActive = useCallback(
    (href: string) => {
      if (href === '/') return pathname === '/';
      return pathname === href || pathname.startsWith(href + '/');
    },
    [pathname]
  );

  // 메모이제이션: 아바타 이니셜
  const avatarInitial = useMemo(
    () => user?.email?.substring(0, 2).toUpperCase() || 'U',
    [user?.email]
  );

  return (
    <aside
      className="w-full h-full flex flex-col bg-[var(--color-sidebar)] border-r border-[var(--color-border)]"
      role="navigation"
      aria-label="사이드바 네비게이션"
    >
      {/* ===== 헤더: PRISM FILTER 로고 + 텍스트 ===== */}
      <div className="border-b border-[var(--color-border)] p-4">
        <Link
          href="/"
          onClick={onClose}
          className="w-full flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-blue-600/10 transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-[var(--color-sidebar)]"
          aria-label="홈으로 돌아가기"
        >
          {/* 프리즘 필터 로고 */}
          <img
            src="/prism-filter-logo.svg"
            alt="PRISM FILTER"
            className="prism-logo w-10 h-10 flex-shrink-0"
          />

          <div className="flex-1">
            <div className="text-sm font-bold text-[var(--color-foreground)]">
              PRISM FILTER
            </div>
            <div className="text-xs text-[var(--color-muted-foreground)]">
              정산 자동화
            </div>
          </div>
        </Link>
      </div>

      {/* ===== 접속 상태 + 내 프로필 ===== */}
      <div className="border-b border-[var(--color-border)] p-4 space-y-3">
        <div className="flex items-center gap-2" role="status" aria-live="polite">
          <span className="flex h-2 w-2 rounded-full bg-green-500" aria-hidden="true" />
          <span className="text-xs text-[var(--color-muted-foreground)]">로그인 중</span>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger>
            <div className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-blue-600/10 transition text-left cursor-pointer focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-2 dark:focus-within:ring-offset-[var(--color-sidebar)]">
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                {avatarInitial}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm text-[var(--color-foreground)]">내 프로필</div>
              </div>
              <span
                className="text-[var(--color-muted-foreground)] flex-shrink-0"
                aria-hidden="true"
              >
                ▾
              </span>
            </div>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            side="bottom"
            align="start"
            className="w-56 bg-[var(--color-card)] border-[var(--color-border)]"
          >
            {/* 사용자 정보 */}
            <div className="px-3 py-2">
              <p className="text-xs text-[var(--color-muted-foreground)] truncate">
                {user?.email}
              </p>
              <p className="text-xs font-medium text-[var(--color-foreground)]">
                {roleLabel}
              </p>
            </div>
            <DropdownMenuSeparator className="bg-[var(--color-border)]" />

            {/* 프로필 설정 */}
            <DropdownMenuItem
              onClick={() => {
                router.push('/profile');
                onClose?.();
              }}
              className="text-[var(--color-foreground)] cursor-pointer"
            >
              👤 내 프로필 설정
            </DropdownMenuItem>

            {/* 계정 관리 (ADMIN만) */}
            {user?.role === 'ADMIN' && (
              <DropdownMenuItem
                onClick={handleAdminAccounts}
                className="text-[var(--color-foreground)] cursor-pointer"
              >
                ⚙️ 계정 관리
              </DropdownMenuItem>
            )}

            <DropdownMenuSeparator className="bg-[var(--color-border)]" />

            {/* 테마 섹션 */}
            <DropdownMenuRadioGroup
              value={theme || 'dark'}
              onValueChange={handleThemeChange}
            >
              <DropdownMenuLabel className="text-[var(--color-foreground)] text-xs font-semibold">
                🎨 테마
              </DropdownMenuLabel>
              <DropdownMenuRadioItem
                value="light"
                className="text-[var(--color-foreground)]"
              >
                ☀️ 라이트
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem
                value="dark"
                className="text-[var(--color-foreground)]"
              >
                🌙 다크
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem
                value="classic-dark"
                className="text-[var(--color-foreground)]"
              >
                🖤 Classic 다크
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>

            <DropdownMenuSeparator className="bg-[var(--color-border)]" />

            {/* 로그아웃 */}
            <DropdownMenuItem
              onClick={handleLogout}
              className="text-red-400 cursor-pointer"
            >
              🚪 로그아웃
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* ===== 메인 네비게이션 ===== */}
      <nav className="flex-1 p-4 overflow-y-auto" aria-label="주요 메뉴">
        <div
          className="text-xs font-semibold uppercase text-[var(--color-muted-foreground)] mb-4 px-2"
          id="nav-label"
        >
          메뉴
        </div>
        <div className="space-y-1">
          {visibleItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                isActive(item.href)
                  ? 'bg-blue-600 text-white'
                  : 'text-[var(--color-foreground)] hover:bg-blue-600/10'
              }`}
              aria-current={isActive(item.href) ? 'page' : undefined}
            >
              <span className="text-lg flex-shrink-0" aria-hidden="true">
                {item.icon}
              </span>
              <span className="truncate">{item.label}</span>
            </a>
          ))}
        </div>
      </nav>

      {/* ===== 하단: 사용자 정보 ===== */}
      <div className="border-t border-[var(--color-border)] p-4">
        <div className="bg-[var(--color-card)]/50 p-3 rounded-lg">
          <p className="text-xs text-[var(--color-muted-foreground)] uppercase mb-1">
            로그인 정보
          </p>
          <p className="text-sm font-semibold text-[var(--color-foreground)] truncate">
            {user?.email}
          </p>
          <p className="text-xs text-[var(--color-muted-foreground)] mt-2">
            역할: {roleLabel}
          </p>
        </div>
      </div>
    </aside>
  );
}
