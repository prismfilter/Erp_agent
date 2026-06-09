'use client';

import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';

interface SiteHeaderProps {
  onMenuClick?: () => void;
}

const pageLabels: Record<string, string> = {
  '/': '홈 피드',
  '/settlement': '정산서',
  '/writers': '전속작가',
  '/staff': '직원',
  '/revenue': '매출현황',
  '/admin/accounts': '계정 관리',
  '/writer-portal': '나의 정산서',
};

export function SiteHeader({ onMenuClick }: SiteHeaderProps) {
  const pathname = usePathname();
  const { user } = useAuthStore();

  const pageTitle = pageLabels[pathname] || '페이지';

  const getInitials = (email?: string) => {
    if (!email) return '?';
    return email.split('@')[0].substring(0, 2).toUpperCase();
  };

  return (
    <>
      <div className="flex items-center gap-4">
        <button onClick={onMenuClick} className="md:hidden text-gray-300 text-2xl">
          ☰
        </button>
        <span className="text-sm font-medium text-gray-100">{pageTitle}</span>
      </div>

      <div>
        <button
          className="w-10 h-10 rounded-full bg-indigo-500 text-white font-semibold text-sm hover:bg-indigo-600 transition-all"
          title={user?.email || '사용자'}
        >
          {getInitials(user?.email)}
        </button>
      </div>
    </>
  );
}
