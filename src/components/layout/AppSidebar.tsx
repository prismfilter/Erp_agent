'use client';

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

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
  };

  const handleAdminAccounts = () => {
    router.push('/admin/accounts');
    onClose?.();
  };

  const getRoleLabel = () => {
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
  };

  const visibleItems = NAV_ITEMS.filter(
    (item) => !item.adminOnly || user?.role === 'ADMIN'
  );

  const isActive = (href: string) => {
    return pathname === href || pathname.startsWith(href);
  };

  return (
    <div className="w-full h-full flex flex-col bg-[var(--color-sidebar)] border-r border-[var(--color-border)]">
      {/* 헤더: PRISM FILTER + 테마 설정 */}
      <div className="border-b border-[var(--color-border)] p-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="w-full flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-blue-900/30 transition">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center font-bold text-white text-sm">
                PF
              </div>
              <div className="flex-1 text-left">
                <div className="text-sm font-bold text-[var(--color-foreground)]">
                  PRISM FILTER
                </div>
                <div className="text-xs text-[var(--color-muted-foreground)]">
                  정산 자동화
                </div>
              </div>
              <span className="text-[var(--color-muted-foreground)]">▾</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            side="bottom"
            align="start"
            className="w-52 bg-[var(--color-card)] border-[var(--color-border)]"
          >
            <DropdownMenuLabel className="text-[var(--color-foreground)]">
              ⚙️ 설정
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-[var(--color-border)]" />
            <DropdownMenuLabel className="text-xs text-[var(--color-muted-foreground)]">
              테마
            </DropdownMenuLabel>
            <DropdownMenuRadioGroup value={theme || 'dark'} onValueChange={setTheme}>
              <DropdownMenuRadioItem value="light">☀️ 라이트</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="dark">🌙 다크</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="classic-dark">
                🖤 Classic 다크
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* 접속 상태 + 내 프로필 */}
      <div className="border-b border-[var(--color-border)] p-4 space-y-3">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 rounded-full bg-green-500"></span>
          <span className="text-xs text-[var(--color-muted-foreground)]">
            로그인 중
          </span>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-blue-900/30 transition">
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">
                {user?.email?.substring(0, 2).toUpperCase() || 'U'}
              </div>
              <div className="flex-1 text-left">
                <div className="text-sm text-[var(--color-foreground)]">내 프로필</div>
              </div>
              <span className="text-[var(--color-muted-foreground)]">▾</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            side="right"
            align="start"
            className="w-56 bg-[var(--color-card)] border-[var(--color-border)]"
          >
            {/* 사용자 정보 */}
            <div className="px-3 py-2">
              <p className="text-xs text-[var(--color-muted-foreground)] truncate">
                {user?.email}
              </p>
              <p className="text-xs font-medium text-[var(--color-foreground)]">
                {getRoleLabel()}
              </p>
            </div>
            <DropdownMenuSeparator className="bg-[var(--color-border)]" />

            {/* 프로필 설정 */}
            <DropdownMenuItem className="text-[var(--color-foreground)] cursor-pointer">
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

      {/* 메뉴 */}
      <nav className="flex-1 p-4 overflow-y-auto">
        <div className="text-xs font-semibold uppercase text-[var(--color-muted-foreground)] mb-4 px-2">
          메뉴
        </div>
        <div className="space-y-2">
          {visibleItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition ${
                isActive(item.href)
                  ? 'bg-blue-600 text-white'
                  : 'text-[var(--color-foreground)] hover:bg-blue-900/30'
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              <span>{item.label}</span>
            </a>
          ))}
        </div>
      </nav>

      {/* 사용자 정보 (하단) */}
      <div className="border-t border-[var(--color-border)] p-4 space-y-2">
        <div className="bg-[var(--color-card)]/50 p-3 rounded-lg">
          <p className="text-xs text-[var(--color-muted-foreground)] uppercase mb-1">
            로그인 정보
          </p>
          <p className="text-sm font-semibold text-[var(--color-foreground)] truncate">
            {user?.email}
          </p>
          <p className="text-xs text-[var(--color-muted-foreground)] mt-2">
            역할: {getRoleLabel()}
          </p>
        </div>
      </div>
    </div>
  );
}
