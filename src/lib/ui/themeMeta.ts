// 테마 아이콘·라벨 공용 정의 — ThemeToggle·사이드바 드롭다운의 이모지 중복을 단일화.
// lucide 아이콘은 currentColor 상속이라 각 테마 텍스트색에 자동 적응.

import { Sun, Moon, MoonStar, Palette, type LucideIcon } from 'lucide-react';

export type ThemeKey = 'light' | 'dark' | 'classic-dark';

export interface ThemeMeta {
  key: ThemeKey;
  label: string;
  Icon: LucideIcon;
  // 아이콘 색상(Tailwind) — 테마별 분위기에 맞는 포인트 색
  color: string;
}

// 표시 순서대로(라이트 → 다크 → Classic 다크)
export const THEME_META: ThemeMeta[] = [
  { key: 'light', label: '라이트', Icon: Sun, color: 'text-amber-500' },
  { key: 'dark', label: '다크', Icon: Moon, color: 'text-indigo-400' },
  { key: 'classic-dark', label: 'Classic 다크', Icon: MoonStar, color: 'text-violet-400' },
];

// 테마 그룹(섹션) 아이콘 + 색상
export const THEME_GROUP_ICON: LucideIcon = Palette;
export const THEME_GROUP_COLOR = 'text-fuchsia-500';

// 현재 테마 → 메타(트리거 아이콘용). 미지정 시 다크.
export function themeMetaOf(theme: string | undefined): ThemeMeta {
  return THEME_META.find((t) => t.key === theme) ?? THEME_META[1];
}
