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
  // 축소 상태에서 사이드바 호버 시 임시 펼침(오버레이) — 마우스를 떼면 다시 축소
  const [hovered, setHovered] = useState(false);
  const effectiveCollapsed = collapsed && !hovered;

  const toggleCollapsed = () =>
    setCollapsed((v) => {
      const next = !v;
      writeCollapsed(next);
      return next;
    });

  return (
    <div className="flex h-screen w-full bg-background">
      {/* 데스크톱 사이드바 — 레일 자리(부모, 축소 폭 유지) + 오버레이(자식, 호버 시 펼침) */}
      <div
        className={`hidden md:block relative ${collapsed ? 'md:w-16' : 'md:w-64'} transition-[width] duration-500 ease-in-out`}
        onMouseEnter={() => { if (collapsed) setHovered(true); }}
        onMouseLeave={() => setHovered(false)}
      >
        <div
          className={`absolute inset-y-0 left-0 ${effectiveCollapsed ? 'w-16' : 'w-64'} transition-[width] duration-500 ease-in-out will-change-[width] z-30 ${
            collapsed && hovered ? 'shadow-2xl' : ''
          }`}
        >
          <AppSidebar
            collapsed={effectiveCollapsed}
            persistentCollapsed={collapsed}
            onToggleCollapse={toggleCollapsed}
          />
        </div>
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

        {/* 콘텐츠 — 사이드바와 동일한 그라디언트 스크롤바(내용 넘칠 때만 노출) */}
        <main className="flex-1 overflow-y-auto p-6 gradient-scroll">
          {children}
        </main>
      </div>
    </div>
  );
}
