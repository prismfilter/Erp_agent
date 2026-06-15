'use client';

import Link from 'next/link';
import { useCallback, useMemo, useState } from 'react';
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

// 트리형(확장 메뉴) 하위 항목
interface NavChild {
  label: string;
  href: string;
}

interface NavItem {
  label: string;
  href?: string;        // children이 있는 트리 부모는 href 없음(토글 전용)
  icon: string;
  adminOnly?: boolean;
  staffOnly?: boolean;  // ADMIN + STAFF만 (작가 역할 숨김)
  section?: string;
  children?: NavChild[]; // 확장형 트리 하위 메뉴
}

const NAV_ITEMS: NavItem[] = [
  // 메뉴 섹션
  { label: '홈 피드', href: '/', icon: '🏠', section: '메뉴' },
  { label: '매출현황', href: '/revenue', icon: '📈', staffOnly: true, section: '메뉴' },
  // 인보이스 섹션
  { label: '거래처 청구서', href: '/invoices', icon: '🧾', staffOnly: true, section: '인보이스' },
  { label: '내부 지급서', href: '/payouts', icon: '💸', staffOnly: true, section: '인보이스' },
  // 정산 섹션 (확장형 트리)
  {
    label: '정산서',
    icon: '📄',
    section: '정산',
    children: [
      { label: '저작권료 정산', href: '/settlement/royalty' },
      { label: '용역 정산', href: '/settlement/service' },
    ],
  },
  // 관리 섹션
  { label: '구성원', href: '/staff', icon: '👥', section: '관리' },
  { label: '작가 마스터', href: '/admin/writers', icon: '✍️', staffOnly: true, section: '관리' },
  { label: '프라이스 테이블', href: '/admin/price-table', icon: '💰', staffOnly: true, section: '관리' },
  { label: '관리자용', href: '/admin/accounts', icon: '⚙️', adminOnly: true, section: '관리' },
];

export function AppSidebar({
  onClose,
  collapsed = false,
  onToggleCollapse,
}: {
  onClose?: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}) {
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

  // 트리(확장형) 메뉴 펼침 상태 — 현재 경로가 하위에 속하면 자동 펼침(lazy init)
  const [openTree, setOpenTree] = useState<Set<string>>(() => {
    const open = new Set<string>();
    NAV_ITEMS.forEach((item) => {
      if (item.children?.some((c) => isActive(c.href))) open.add(item.label);
    });
    return open;
  });

  const toggleTree = useCallback((label: string) => {
    setOpenTree((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  }, []);

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
      {/* ===== 헤더: 로고 + 접기/펼치기 버튼 ===== */}
      <div
        className={`group border-b border-border ${
          collapsed ? 'flex flex-col items-center gap-2 py-3 px-2' : 'h-16 flex items-center px-4'
        }`}
      >
        <Link
          href="/"
          onClick={onClose}
          className={`flex items-center rounded-lg transition focus:outline-none min-w-0 ${
            collapsed ? 'justify-center' : 'flex-1 gap-3 px-3'
          }`}
          aria-label="홈으로 돌아가기"
        >
          <img
            src="/prism-filter-logo.svg"
            alt="PRISM FILTER"
            className={`prism-logo flex-shrink-0 ${collapsed ? 'w-9 h-9' : 'w-10 h-10'}`}
          />
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold text-foreground truncate">PRISM FILTER</div>
              <div className="text-xs text-muted-foreground truncate">정산 자동화</div>
            </div>
          )}
        </Link>

        {/* 접기/펼치기 토글 (데스크톱 전용 — onToggleCollapse 있을 때만) */}
        {onToggleCollapse && (
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label={collapsed ? '사이드바 펼치기' : '사이드바 접기'}
            title={collapsed ? '사이드바 펼치기' : '사이드바 접기'}
            className={`flex-shrink-0 p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-primary/15 transition cursor-pointer ${
              collapsed ? '' : 'ml-1 opacity-0 group-hover:opacity-100'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect width="18" height="18" x="3" y="3" rx="2" />
              <path d="M9 3v18" />
              {collapsed ? <path d="m14 9 3 3-3 3" /> : <path d="m16 15-3-3 3-3" />}
            </svg>
          </button>
        )}
      </div>

      {/* ===== 메인 네비게이션 (섹션 그룹) ===== */}
      <nav
        className={`flex-1 ${collapsed ? 'p-2 overflow-visible' : 'p-4 overflow-y-auto'}`}
        aria-label="주요 메뉴"
      >
        <div className="space-y-6">
          {groupedItems.map(([section, items], idx) => (
            <div key={section}>
              {idx > 0 && <hr className="border-border mb-5 mt-2" />}
              {/* 섹션 레이블 (접힘 시 숨김) */}
              {!collapsed && (
                <div className="text-xs font-semibold text-muted-foreground mb-3 px-2 uppercase tracking-wider">
                  {section}
                </div>
              )}
              {/* 섹션 내 메뉴 아이템 */}
              <div className="space-y-1">
                {items.map((item) => {
                  // ── 확장형 트리(하위 메뉴 있음) ──
                  if (item.children && item.children.length > 0) {
                    const childActive = item.children.some((c) => isActive(c.href));
                    const open = openTree.has(item.label);

                    // 접힘 사이드바: 펼칠 공간이 없으므로 첫 하위로 이동하는 아이콘 링크 + 툴팁
                    if (collapsed) {
                      return (
                        <Link
                          key={item.label}
                          href={item.children[0].href}
                          onClick={onClose}
                          className={`group/item relative flex items-center justify-center px-0 py-2 rounded-lg text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-primary/50 ${
                            childActive
                              ? 'bg-primary text-primary-foreground shadow-md'
                              : 'text-sidebar-foreground hover:bg-primary/15'
                          }`}
                          aria-current={childActive ? 'page' : undefined}
                        >
                          <span className="text-lg flex-shrink-0" aria-hidden="true">
                            {item.icon}
                          </span>
                          <span className="pointer-events-none absolute left-full ml-2 z-50 whitespace-nowrap rounded-md bg-foreground px-2 py-1 text-xs font-medium text-background opacity-0 shadow-lg transition-opacity group-hover/item:opacity-100">
                            {item.label}
                          </span>
                        </Link>
                      );
                    }

                    // 펼침 사이드바: 부모 토글 버튼 + 하위 목록
                    return (
                      <div key={item.label}>
                        <button
                          type="button"
                          onClick={() => toggleTree(item.label)}
                          aria-expanded={open}
                          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/50 ${
                            childActive
                              ? 'bg-primary/10 text-foreground'
                              : 'text-sidebar-foreground hover:bg-primary/15'
                          }`}
                        >
                          <span className="text-lg flex-shrink-0" aria-hidden="true">
                            {item.icon}
                          </span>
                          <span className="flex-1 text-left truncate">{item.label}</span>
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className={`flex-shrink-0 text-muted-foreground transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
                            aria-hidden="true"
                          >
                            <path d="m6 9 6 6 6-6" />
                          </svg>
                        </button>
                        {/* 하위 목록 */}
                        {open && (
                          <div className="mt-1 space-y-1">
                            {item.children.map((child) => {
                              const active = isActive(child.href);
                              return (
                                <Link
                                  key={child.href}
                                  href={child.href}
                                  onClick={onClose}
                                  className={`flex items-center gap-2 pl-9 pr-3 py-2 rounded-lg text-sm transition focus:outline-none focus:ring-2 focus:ring-primary/50 ${
                                    active
                                      ? 'bg-primary text-primary-foreground font-medium shadow-md'
                                      : 'text-sidebar-foreground hover:bg-primary/15'
                                  }`}
                                  aria-current={active ? 'page' : undefined}
                                >
                                  <span
                                    className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${
                                      active ? 'bg-primary-foreground' : 'bg-muted-foreground'
                                    }`}
                                    aria-hidden="true"
                                  />
                                  <span className="truncate">{child.label}</span>
                                </Link>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  }

                  // ── 일반 단일 메뉴 ──
                  const href = item.href ?? '/';
                  return (
                    <Link
                      key={href}
                      href={href}
                      onClick={onClose}
                      className={`group/item relative flex items-center py-2 rounded-lg text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-primary/50 ${
                        collapsed ? 'justify-center px-0' : 'gap-3 px-3'
                      } ${
                        isActive(href)
                          ? 'bg-primary text-primary-foreground shadow-md'
                          : 'text-sidebar-foreground hover:bg-primary/15'
                      }`}
                      aria-current={isActive(href) ? 'page' : undefined}
                    >
                      <span className="text-lg flex-shrink-0" aria-hidden="true">
                        {item.icon}
                      </span>
                      {!collapsed && <span className="truncate">{item.label}</span>}
                      {/* 접힘 시 호버 툴팁 (블럭 텍스트) */}
                      {collapsed && (
                        <span className="pointer-events-none absolute left-full ml-2 z-50 whitespace-nowrap rounded-md bg-foreground px-2 py-1 text-xs font-medium text-background opacity-0 shadow-lg transition-opacity group-hover/item:opacity-100">
                          {item.label}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </nav>

      {/* ===== 하단: 사용자 프로필 ===== */}
      <div className={`border-t border-border ${collapsed ? 'p-2' : 'p-4'}`}>
        <DropdownMenu>
          <DropdownMenuTrigger
            className={`w-full flex items-center py-3 rounded-lg hover:bg-blue-600/10 transition text-left cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-sidebar ${
              collapsed ? 'justify-center' : 'gap-3 px-3'
            }`}
          >
            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
              {avatarInitial}
            </div>
            {!collapsed && (
              <>
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
              </>
            )}
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
