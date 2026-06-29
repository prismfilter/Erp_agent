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
import { THEME_META, THEME_GROUP_ICON, THEME_GROUP_COLOR, themeMetaOf } from '@/lib/ui/themeMeta';

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

  const currentTheme = themeMetaOf(theme);
  const CurrentIcon = currentTheme.Icon;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="테마 변경"
        title="테마 변경"
        className={`h-9 w-9 flex items-center justify-center rounded-lg border border-border bg-card text-foreground hover:bg-muted transition cursor-pointer ${className ?? ''}`}
      >
        <CurrentIcon className={`w-5 h-5 ${currentTheme.color}`} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44 bg-card border border-border">
        {/* GroupLabel은 base-ui RadioGroup/Group 컨텍스트 안에 있어야 함 → 라벨을 RadioGroup 안에 둔다 */}
        <DropdownMenuRadioGroup
          value={theme ?? 'dark'}
          onValueChange={(v) => setTheme(String(v))}
        >
          <DropdownMenuLabel className="text-foreground text-xs font-semibold flex items-center gap-1.5">
            <THEME_GROUP_ICON className={`w-3.5 h-3.5 ${THEME_GROUP_COLOR}`} /> 테마
          </DropdownMenuLabel>
          {THEME_META.map(({ key, label, Icon, color }) => (
            <DropdownMenuRadioItem key={key} value={key} className="text-foreground cursor-pointer gap-2">
              <Icon className={`w-4 h-4 ${color}`} /> {label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
