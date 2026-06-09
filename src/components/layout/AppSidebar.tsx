'use client';

import Link from 'next/link';
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

  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme);
    document.cookie = `prism-theme=${newTheme}; path=/; max-age=31536000; SameSite=Lax`;
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

  // isActive 수정: '/'는 exact match, 다른 경로는 하위포함
  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname === href || pathname.startsWith(href + '/');
  };

  return (
    <aside className="w-full h-full flex flex-col bg-[var(--color-sidebar)] border-r border-[var(--color-border)]">
      {/* ===== 헤더: PRISM FILTER 로고 + 텍스트 (Link) ===== */}
      <div className="border-b border-[var(--color-border)] p-4">
        <Link
          href="/"
          onClick={onClose}
          className="w-full flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-blue-600/10 transition"
        >
          {/* 프리즘 필터 로고 SVG (dark/classic-dark에서 흰색) */}
          <svg
            className="prism-logo w-10 h-10 flex-shrink-0"
            viewBox="0 0 550 562"
            xmlns="http://www.w3.org/2000/svg"
          >
            <g transform="translate(0,562) scale(0.1,-0.1)" fill="currentColor" stroke="none">
              <path d="M2687 4958 c-30 -51 -81 -140 -114 -198 -34 -58 -144 -249 -245 -425 -302 -523 -505 -874 -670 -1160 -86 -148 -332 -576 -548 -950 -216 -374 -478 -828 -583 -1010 -104 -181 -230 -399 -279 -483 -50 -84 -88 -155 -86 -158 3 -2 1166 -3 2585 -2 l2581 3 -72 125 c-177 306 -477 826 -681 1180 -232 403 -384 666 -730 1265 -114 198 -260 450 -323 560 -63 110 -179 310 -257 445 -78 135 -213 369 -300 520 -87 151 -168 292 -181 312 -13 21 -24 42 -24 47 0 34 -26 9 -73 -71z m285 -983 c121 -209 272 -472 337 -585 65 -113 192 -333 283 -490 180 -311 531 -921 695 -1204 57 -99 103 -181 103 -183 0 -2 -741 -3 -1646 -3 -1512 0 -1646 1 -1640 16 3 9 73 132 155 273 82 141 201 348 266 461 65 113 183 318 263 455 139 242 344 596 637 1105 78 135 179 311 226 392 46 81 88 146 93 145 5 -2 108 -174 228 -382z m-1054 -2769 c38 -20 61 -47 68 -84 6 -31 6 -32 -29 -32 -28 0 -36 4 -41 24 -3 14 -18 29 -36 36 -25 10 -34 10 -55 -4 -30 -20 -33 -51 -6 -66 11 -5 43 -15 72 -21 94 -20 132 -85 94 -159 -21 -40 -69 -64 -130 -64 -64 0 -106 28 -129 84 -23 57 -21 62 22 58 30 -2 38 -7 40 -25 7 -50 85 -70 123 -32 39 39 20 57 -96 88 -60 16 -85 43 -85 94 0 23 7 53 16 66 33 46 119 65 172 37z m-964 -10 c44 -18 66 -52 66 -101 0 -49 -22 -83 -66 -101 -47 -20 -54 -18 -54 15 0 21 6 32 21 36 11 4 24 16 28 28 18 50 -14 77 -90 77 l-39 0 0 -150 0 -150 -35 0 -35 0 0 180 0 180 85 0 c51 0 99 -6 119 -14z" />
            </g>
          </svg>

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

      {/* ===== 접속 상태 + 내 프로필 (테마 포함) ===== */}
      <div className="border-b border-[var(--color-border)] p-4 space-y-3">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 rounded-full bg-green-500"></span>
          <span className="text-xs text-[var(--color-muted-foreground)]">
            로그인 중
          </span>
        </div>

        <DropdownMenu>
          <div className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-blue-600/10 transition text-left">
            <DropdownMenuTrigger className="w-full flex items-center gap-3 text-left">
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                {user?.email?.substring(0, 2).toUpperCase() || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm text-[var(--color-foreground)]">내 프로필</div>
              </div>
              <span className="text-[var(--color-muted-foreground)] flex-shrink-0">▾</span>
            </DropdownMenuTrigger>
          </div>

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

            {/* 테마 섹션 */}
            <DropdownMenuLabel className="text-[var(--color-foreground)] text-xs font-semibold">
              🎨 테마
            </DropdownMenuLabel>
            <DropdownMenuRadioGroup value={theme || 'dark'} onValueChange={handleThemeChange}>
              <DropdownMenuRadioItem value="light" className="text-[var(--color-foreground)]">
                ☀️ 라이트
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="dark" className="text-[var(--color-foreground)]">
                🌙 다크
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="classic-dark" className="text-[var(--color-foreground)]">
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
      <nav className="flex-1 p-4 overflow-y-auto">
        <div className="text-xs font-semibold uppercase text-[var(--color-muted-foreground)] mb-4 px-2">
          메뉴
        </div>
        <div className="space-y-1">
          {visibleItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition ${
                isActive(item.href)
                  ? 'bg-blue-600 text-white'
                  : 'text-[var(--color-foreground)] hover:bg-blue-600/10'
              }`}
            >
              <span className="text-lg flex-shrink-0">{item.icon}</span>
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
            역할: {getRoleLabel()}
          </p>
        </div>
      </div>
    </aside>
  );
}
