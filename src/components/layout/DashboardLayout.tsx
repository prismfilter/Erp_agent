'use client';

import { useState } from 'react';
import { AppSidebar } from './AppSidebar';
import { SiteHeader } from './SiteHeader';

// 사이드바 접힘 상태 — 쿠키로 유지(쿠키 삭제 시 초기화)
const COLLAPSE_COOKIE = 'pf_sidebar_collapsed';

function readCollapsed(): boolean {
  if (typeof document === 'undefined') return false;
  return document.cookie.split('; ').some((c) => c === `${COLLAPSE_COOKIE}=1`);
}

function writeCollapsed(v: boolean): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${COLLAPSE_COOKIE}=${v ? '1' : '0'}; path=/; max-age=31536000`;
}

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setOpen] = useState(false);
  // DashboardLayout은 인증 로더 통과 후 클라이언트에서만 마운트 → lazy 쿠키 초기화 안전(플래시 없음)
  const [collapsed, setCollapsed] = useState(() => readCollapsed());

  const toggleCollapsed = () =>
    setCollapsed((v) => {
      const next = !v;
      writeCollapsed(next);
      return next;
    });

  return (
    <div className="flex h-screen w-full bg-background">
      {/* 데스크톱 사이드바 */}
      <div className={`hidden md:flex ${collapsed ? 'md:w-16' : 'md:w-64'} flex-col transition-[width] duration-200`}>
        <AppSidebar collapsed={collapsed} onToggleCollapse={toggleCollapsed} />
      </div>

      {/* 모바일 사이드바 오버레이 */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-64 z-50 overflow-y-auto">
            <AppSidebar onClose={() => setOpen(false)} />
          </div>
        </div>
      )}

      {/* 메인 영역 */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* 헤더 (데스크톱 + 모바일) */}
        <SiteHeader onMenuClick={() => setOpen(true)} />

        {/* 콘텐츠 */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
