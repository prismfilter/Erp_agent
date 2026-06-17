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
  // 저작물 DB — 확장형 트리(영구/일반 하위 메뉴)
  {
    label: '저작물 DB',
    icon: '🎵',
    staffOnly: true,
    section: '관리',
    children: [
      { label: '영구 저작물 DB', href: '/admin/works/permanent' },
      { label: '일반 저작물 DB', href: '/admin/works/general' },
    ],
  },
  { label: '프라이스 테이블', href: '/admin/price-table', icon: '💰', staffOnly: true, section: '관리' },
  { label: '관리자용', href: '/admin/accounts', icon: '⚙️', adminOnly: true, section: '관리' },
];

export function AppSidebar({
  onClose,
  collapsed = false,
  persistentCollapsed = false,
  onToggleCollapse,
}: {
  onClose?: () => void;
  collapsed?: boolean;
  // 영속(고정) 접힘 상태 — 호버로 임시 펼쳐졌을 때 토글 라벨을 '펼치기'로 보이게 하기 위함
  persistentCollapsed?: boolean;
  onToggleCollapse?: () => void;
}) {
  const pathname = usePathname();
  // 호버로 펼쳐진(=실제로는 접힘) 상태에서 클릭하면 고정 펼침 → '펼치기', 그 외엔 '접기'
  const toggleLabel = persistentCollapsed ? '사이드바 펼치기' : '사이드바 접기';
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
      {/* ===== 헤더: 로고 + 접기 버튼 (메뉴와 동일 패턴: 가로 고정, 로고 고정폭 가운데) ===== */}
      {/* 헤더 좌우 패딩을 nav(축소 p-2 / 펼침 p-4)와 일치시켜 로고가 메뉴 아이콘과 같은 위치·움직임을 갖게 함 */}
      <div className={`group h-16 flex items-center border-b border-border ${collapsed ? '' : 'pr-2'}`}>
        <Link
          href="/"
          onClick={onClose}
          className="flex items-center flex-1 min-w-0 rounded-lg transition focus:outline-none"
          aria-label="홈으로 돌아가기"
        >
          {/* 로고: 축소 사이드바 폭(w-16)에 가운데 정렬 → 축소 시 사이드바 중앙, 펼침 시 동일 위치(좌측 고정·점프 방지) */}
          <span className="w-16 flex justify-center flex-shrink-0">
            <img
              src="/prismfilter-logo.png"
              alt="PRISMFILTER MUSIC GROUP"
              className="prism-logo w-12 h-12"
            />
          </span>
          {!collapsed && (
            <div className="flex-1 min-w-0 whitespace-nowrap">
              <div className="text-sm font-bold text-foreground truncate">PRISMFILTER ERP</div>
              <div className="text-xs text-muted-foreground truncate">정산 자동화</div>
            </div>
          )}
        </Link>

        {/* 접기/펼치기 토글 (펼침·호버펼침 상태에서 호버 노출) — 라벨·아이콘은 실제 영속 상태 기준 */}
        {onToggleCollapse && !collapsed && (
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label={toggleLabel}
            title={toggleLabel}
            className="flex-shrink-0 ml-1 p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-primary/15 transition cursor-pointer opacity-0 group-hover:opacity-100"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect width="18" height="18" x="3" y="3" rx="2" />
              <path d="M9 3v18" />
              {/* 펼치기일 땐 화살표 오른쪽, 접기일 땐 왼쪽 */}
              <path d={persistentCollapsed ? 'm14 9 3 3-3 3' : 'm16 15-3-3 3-3'} />
            </svg>
          </button>
        )}
      </div>

      {/* ===== 메인 네비게이션 (섹션 그룹) ===== */}
      <nav
        className={`flex-1 ${collapsed ? 'p-2 overflow-visible' : 'p-4 overflow-y-auto overflow-x-hidden sidebar-scroll'}`}
        aria-label="주요 메뉴"
      >
        <div className="space-y-6">
          {groupedItems.map(([section, items], idx) => (
            <div key={section}>
              {idx > 0 && <hr className="border-border mb-5 mt-2" />}
              {/* 섹션 레이블 (접힘 시 숨김) */}
              {!collapsed && (
                <div className="text-xs font-semibold text-muted-foreground mb-3 px-2 uppercase tracking-wider whitespace-nowrap overflow-hidden">
                  {section}
                </div>
              )}
              {/* 섹션 내 메뉴 아이템 */}
              <div className="space-y-1">
                {items.map((item) => {
                  // ── 확장형 트리(하위 메뉴 있음) — 축소/펼침 공통 구조 ──
                  // 하위 목록을 항상 DOM에 두고 grid-rows 0fr↔1fr 트랜지션으로 슬라이드.
                  // 축소→호버 펼침 시 하위가 부드럽게 내려오며 아래 섹션을 밀어낸다.
                  if (item.children && item.children.length > 0) {
                    const childActive = item.children.some((c) => isActive(c.href));
                    const open = openTree.has(item.label);
                    const showChildren = !collapsed && open; // 축소면 무조건 닫힘

                    return (
                      <div key={item.label}>
                        <button
                          type="button"
                          onClick={() => { if (!collapsed) toggleTree(item.label); }}
                          aria-expanded={!collapsed && open}
                          className={`w-full flex items-center py-2 rounded-lg text-sm font-medium transition cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/50 ${
                            collapsed ? 'justify-center' : 'pr-3'
                          } ${
                            childActive
                              ? collapsed
                                ? 'bg-primary text-primary-foreground shadow-md'
                                : 'bg-primary/10 text-foreground'
                              : 'text-sidebar-foreground hover:bg-primary/15'
                          }`}
                          aria-current={collapsed && childActive ? 'page' : undefined}
                        >
                          {/* 아이콘 고정폭 영역 — 일반 메뉴와 동일(가운데) → 정렬 점프 방지 */}
                          <span className="w-8 flex justify-center flex-shrink-0 text-lg" aria-hidden="true">
                            {item.icon}
                          </span>
                          {!collapsed && (
                            <>
                              <span className="ml-1 flex-1 text-left truncate whitespace-nowrap">{item.label}</span>
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
                                className={`flex-shrink-0 text-muted-foreground transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
                                aria-hidden="true"
                              >
                                <path d="m6 9 6 6 6-6" />
                              </svg>
                            </>
                          )}
                        </button>
                        {/* 하위 목록 — grid-rows 0fr↔1fr 슬라이드 (자식 overflow-hidden 필수) */}
                        <div
                          className={`grid transition-[grid-template-rows] duration-500 ease-in-out ${
                            showChildren ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
                          }`}
                        >
                          <div className="overflow-hidden">
                            <div className="mt-1 space-y-1">
                              {item.children.map((child) => {
                                const active = isActive(child.href);
                                return (
                                  <Link
                                    key={child.href}
                                    href={child.href}
                                    onClick={onClose}
                                    tabIndex={showChildren ? undefined : -1}
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
                          </div>
                        </div>
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
                        collapsed ? 'justify-center' : 'pr-3'
                      } ${
                        isActive(href)
                          ? 'bg-primary text-primary-foreground shadow-md'
                          : 'text-sidebar-foreground hover:bg-primary/15'
                      }`}
                      aria-current={isActive(href) ? 'page' : undefined}
                    >
                      {/* 아이콘 고정폭 영역 — 축소/펼침에서 위치 동일(가운데) → 정렬 점프 방지 */}
                      <span className="w-8 flex justify-center flex-shrink-0 text-lg" aria-hidden="true">
                        {item.icon}
                      </span>
                      {!collapsed && <span className="ml-1 flex-1 truncate whitespace-nowrap">{item.label}</span>}
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
