'use client';

import { useState } from 'react';
import { AppSidebar } from './AppSidebar';
import { SiteHeader } from './SiteHeader';

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setOpen] = useState(false);

  return (
    <div className="flex h-screen w-full bg-[var(--color-background)]">
      {/* 데스크톱 사이드바 */}
      <div className="hidden md:flex md:w-64 flex-col">
        <AppSidebar />
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
