'use client';

// 테마 토글 — next-themes 3종(light/dark/classic-dark). 로그인 페이지·기타 어디서나 재사용.
// 마운트 가드로 SSR 하이드레이션 불일치 방지(next-themes 권장).

import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from '@/components/ui/dropdown-menu';

const THEME_ICON: Record<string, string> = {
  light: '☀️',
  dark: '🌙',
  'classic-dark': '🖤',
};

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- 마운트 가드(하이드레이션 불일치 방지)
  useEffect(() => setMounted(true), []);

  // 마운트 전: 동일 크기 placeholder (레이아웃 시프트/불일치 방지)
  if (!mounted) {
    return (
      <div
        className={`h-9 w-9 rounded-lg border border-border bg-card ${className ?? ''}`}
        aria-hidden
      />
    );
  }

  const current = THEME_ICON[theme ?? 'dark'] ?? THEME_ICON.dark;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="테마 변경"
        title="테마 변경"
        className={`h-9 w-9 flex items-center justify-center rounded-lg border border-border bg-card text-base hover:bg-muted transition cursor-pointer ${className ?? ''}`}
      >
        {current}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44 bg-card border border-border">
        <DropdownMenuLabel className="text-foreground text-xs font-semibold">🎨 테마</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={theme ?? 'dark'}
          onValueChange={(v) => setTheme(String(v))}
        >
          <DropdownMenuRadioItem value="light" className="text-foreground cursor-pointer">
            ☀️ 라이트
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="dark" className="text-foreground cursor-pointer">
            🌙 다크
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="classic-dark" className="text-foreground cursor-pointer">
            🖤 Classic 다크
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
