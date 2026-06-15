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
  staffOnly?: boolean; // ADMIN + STAFF만 (작가 역할 숨김)
  section?: string;
}

const NAV_ITEMS: NavItem[] = [
  // 메뉴 섹션
  { label: '홈 피드', href: '/', icon: '🏠', section: '메뉴' },
  { label: '매출현황', href: '/revenue', icon: '📈', staffOnly: true, section: '메뉴' },
  { label: '정산서', href: '/settlement', icon: '📄', section: '메뉴' },
  // 인보이스 섹션
  { label: '거래처 청구서', href: '/invoices', icon: '🧾', staffOnly: true, section: '인보이스' },
  { label: '내부 지급서', href: '/payouts', icon: '💸', staffOnly: true, section: '인보이스' },
  // 관리 섹션
  { label: '구성원', href: '/staff', icon: '👥', section: '관리' },
  { label: '작가 마스터', href: '/admin/writers', icon: '✍️', staffOnly: true, section: '관리' },
  { label: '프라이스 테이블', href: '/admin/price-table', icon: '💰', staffOnly: true, section: '관리' },
  { label: '관리자용', href: '/admin/accounts', icon: '⚙️', adminOnly: true, section: '관리' },
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
      case 'ADMIN':            return '👑 관리자';
      case 'STAFF':            return '💼 직원';
      case 'EXCLUSIVE_WRITER': return '✍️ 전속 작가';
      case 'GENERAL_WRITER':   return '📝 일반 작가';
      default:                 return '미지정';
    }
  }, [user?.role]);

  // 메모이제이션: 표시할 메뉴 아이템
  const visibleItems = useMemo(
    () =>
      NAV_ITEMS.filter((item) => {
        if (item.adminOnly) return user?.role === 'ADMIN';
        if (item.staffOnly) return user?.role === 'ADMIN' || user?.role === 'STAFF';
        return true;
      }),
    [user?.role]
  );

  // 섹션별 아이템 그룹핑
  const groupedItems = useMemo(() => {
    const groups = new Map<string, NavItem[]>();
    visibleItems.forEach((item) => {
      const section = item.section || '기타';
      if (!groups.has(section)) {
        groups.set(section, []);
      }
      groups.get(section)!.push(item);
    });
    return Array.from(groups.entries());
  }, [visibleItems]);

  // 메모이제이션: 활성 경로 확인
  const isActive = useCallback(
    (href: string) => {
      if (href === '/') return pathname === '/';
      return pathname === href || pathname.startsWith(href + '/');
    },
    [pathname]
  );

  // 아바타 이니셜 (이름 우선, 없으면 이메일 앞 2자) — 단순 계산이라 메모이제이션 불필요
  const avatarInitial = user?.name
    ? user.name.substring(0, 1).toUpperCase()
    : user?.email?.substring(0, 2).toUpperCase() || 'U';

  return (
    <aside
      className="w-full h-full flex flex-col bg-sidebar border-r border-border"
      role="navigation"
      aria-label="사이드바 네비게이션"
    >
      {/* ===== 헤더: PRISM FILTER 로고 + 텍스트 ===== */}
      <div className="border-b border-border h-16 flex items-center px-4">
        <Link
          href="/"
          onClick={onClose}
          className="w-full flex items-center gap-3 px-3 rounded-lg transition focus:outline-none"
          aria-label="홈으로 돌아가기"
        >
          {/* 프리즘 필터 로고 */}
          <img
            src="/prism-filter-logo.svg"
            alt="PRISM FILTER"
            className="prism-logo w-10 h-10 flex-shrink-0"
          />

          <div className="flex-1">
            <div className="text-sm font-bold text-foreground">
              PRISM FILTER
            </div>
            <div className="text-xs text-muted-foreground">
              정산 자동화
            </div>
          </div>
        </Link>
      </div>

      {/* ===== 메인 네비게이션 (섹션 그룹) ===== */}
      <nav className="flex-1 p-4 overflow-y-auto" aria-label="주요 메뉴">
        <div className="space-y-6">
          {groupedItems.map(([section, items], idx) => (
            <div key={section}>
              {idx > 0 && <hr className="border-border mb-5 mt-2" />}
              {/* 섹션 레이블 */}
              <div className="text-xs font-semibold text-muted-foreground mb-3 px-2 uppercase tracking-wider">
                {section}
              </div>
              {/* 섹션 내 메뉴 아이템 */}
              <div className="space-y-1">
                {items.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onClose}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-primary/50 ${
                      isActive(item.href)
                        ? 'bg-primary text-primary-foreground shadow-md'
                        : 'text-sidebar-foreground hover:bg-primary/15'
                    }`}
                    aria-current={isActive(item.href) ? 'page' : undefined}
                  >
                    <span className="text-lg flex-shrink-0" aria-hidden="true">
                      {item.icon}
                    </span>
                    <span className="truncate">{item.label}</span>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </nav>

      {/* ===== 하단: 사용자 프로필 (Image #20 스타일) ===== */}
      <div className="border-t border-border p-4">
        <DropdownMenu>
          <DropdownMenuTrigger className="w-full flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-blue-600/10 transition text-left cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-sidebar">
            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
              {avatarInitial}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-foreground truncate">
                {user?.name ?? user?.email?.split('@')[0]}
              </div>
              <div className="text-xs text-muted-foreground truncate">
                {user?.email}
              </div>
            </div>
            <span className="text-muted-foreground flex-shrink-0" aria-hidden="true">
              ▾
            </span>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="w-56 bg-card border-border">
            {/* 사용자 정보 */}
            <div className="px-3 py-2">
              <p className="text-xs text-muted-foreground truncate">
                {user?.email}
              </p>
              <p className="text-xs font-medium text-foreground">
                {roleLabel}
              </p>
            </div>
            <DropdownMenuSeparator className="bg-border" />

            {/* 프로필 설정 */}
            <DropdownMenuItem
              onClick={() => {
                router.push('/profile');
                onClose?.();
              }}
              className="text-foreground cursor-pointer"
            >
              👤 내 프로필 설정
            </DropdownMenuItem>

            {/* 계정 관리 (ADMIN만) */}
            {user?.role === 'ADMIN' && (
              <DropdownMenuItem
                onClick={handleAdminAccounts}
                className="text-foreground cursor-pointer"
              >
                ⚙️ 계정 관리
              </DropdownMenuItem>
            )}

            <DropdownMenuSeparator className="bg-border" />

            {/* 테마 섹션 */}
            <DropdownMenuRadioGroup
              value={theme || 'dark'}
              onValueChange={handleThemeChange}
            >
              <DropdownMenuLabel className="text-foreground text-xs font-semibold">
                🎨 테마
              </DropdownMenuLabel>
              <DropdownMenuRadioItem
                value="light"
                className="text-foreground"
              >
                ☀️ 라이트
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem
                value="dark"
                className="text-foreground"
              >
                🌙 다크
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem
                value="classic-dark"
                className="text-foreground"
              >
                🖤 Classic 다크
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>

            <DropdownMenuSeparator className="bg-border" />

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
    </aside>
  );
}
