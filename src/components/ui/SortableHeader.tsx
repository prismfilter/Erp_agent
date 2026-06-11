'use client';

// 정렬 화살표가 달린 테이블 헤더(th) — useTableSort와 함께 사용
// 비활성: 흐린 양방향 화살표 / 오름: 위 화살표 / 내림: 아래 화살표

import { ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import type { SortDir } from '@/hooks/useTableSort';

interface SortableHeaderProps {
  label: string;
  sortKey: string;
  activeKey: string | null;
  dir: SortDir;
  onSort: (key: string) => void;
  align?: 'left' | 'center' | 'right';
  className?: string;
}

const JUSTIFY: Record<NonNullable<SortableHeaderProps['align']>, string> = {
  left: 'justify-start',
  center: 'justify-center',
  right: 'justify-end',
};

export function SortableHeader({
  label,
  sortKey,
  activeKey,
  dir,
  onSort,
  align = 'left',
  className = '',
}: SortableHeaderProps) {
  const isActive = activeKey === sortKey;

  return (
    // 패딩·text-xs·uppercase 등은 호출측 className으로 제어 (페이지별 상이)
    <th className={`font-semibold text-foreground ${className}`}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={`flex items-center gap-1 w-full whitespace-nowrap cursor-pointer transition hover:text-primary ${JUSTIFY[align]} ${
          isActive ? 'text-primary' : ''
        }`}
        title="클릭하여 정렬"
      >
        <span>{label}</span>
        {isActive ? (
          dir === 'asc' ? (
            <ArrowUp className="w-3.5 h-3.5 flex-shrink-0" />
          ) : (
            <ArrowDown className="w-3.5 h-3.5 flex-shrink-0" />
          )
        ) : (
          <ArrowUpDown className="w-3.5 h-3.5 flex-shrink-0 opacity-30" />
        )}
      </button>
    </th>
  );
}
