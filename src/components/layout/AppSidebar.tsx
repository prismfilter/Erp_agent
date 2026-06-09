'use client';

import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';

interface AppSidebarProps {
  onClose?: () => void;
}

export function AppSidebar({ onClose }: AppSidebarProps) {
  const pathname = usePathname();
  const { user } = useAuthStore();

  const navItems = [
    { label: '🏠 홈 피드', href: '/' },
    { label: '👥 직원', href: '/staff' },
    { label: '✍️ 전속작가', href: '/writers', adminOnly: true },
    { label: '📈 매출현황', href: '/revenue' },
    { label: '📄 정산서', href: '/settlement' },
    { label: '⚙️ 계정 관리', href: '/admin/accounts', adminOnly: true },
  ];

  const filtered = navItems.filter(
    (item) => !item.adminOnly || user?.role === 'ADMIN'
  );

  const isActive = (href: string) => {
    return pathname === href || pathname.startsWith(href);
  };

  return (
    <>
      {/* 로고 */}
      <div className="border-b border-slate-700 p-6 flex items-center gap-3">
        <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-lg flex items-center justify-center font-bold text-white text-lg">
          PF
        </div>
        <div>
          <h1 className="text-base font-bold text-gray-100">PRISM FILTER</h1>
          <p className="text-xs text-gray-400">정산 자동화</p>
        </div>
      </div>

      {/* 메뉴 */}
      <nav className="flex-1 p-4 overflow-y-auto">
        <div className="text-xs font-semibold uppercase text-gray-400 mb-4 px-2">
          메뉴
        </div>
        {filtered.map((item) => (
          <a
            key={item.href}
            href={item.href}
            onClick={onClose}
            className={`block px-4 py-3 rounded-lg text-sm transition-all mb-2 ${
              isActive(item.href)
                ? 'bg-indigo-500 text-white font-semibold shadow-lg'
                : 'text-gray-300 hover:bg-slate-700'
            }`}
          >
            {item.label}
          </a>
        ))}
      </nav>

      {/* 사용자 정보 */}
      <div className="border-t border-slate-700 p-4 space-y-3">
        {user && (
          <div className="bg-slate-700/50 p-3 rounded-lg">
            <p className="text-xs text-gray-400 uppercase mb-1">로그인</p>
            <p className="text-sm font-semibold text-gray-100">{user.email}</p>
            <p className="text-xs text-gray-400 mt-2">
              역할: {user.role === 'ADMIN' ? '👑 관리자' : user.role === 'STAFF' ? '💼 직원' : '✍️ 작가'}
            </p>
          </div>
        )}
        <button className="w-full bg-red-500/10 text-red-400 px-4 py-3 rounded-lg text-sm font-medium hover:bg-red-500/20 transition-all">
          🚪 로그아웃
        </button>
      </div>
    </>
  );
}
