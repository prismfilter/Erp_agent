// 페이지 공통 헤더 — 제목+부제+우측 액션, 하단 가로 구분선(전 메뉴 통일)
// 작가 마스터 헤더 구분선 스타일(border-b border-border)을 모든 메뉴에 일관 적용.

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  titleClassName?: string;
  className?: string;
  // 헤더 바로 밑에 탭바가 있어 탭이 구분선 역할을 하면 false로 구분선 생략
  divider?: boolean;
}

export function PageHeader({
  title,
  description,
  actions,
  titleClassName,
  className,
  divider = true,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-start justify-between gap-3',
        divider && 'border-b border-border pb-4',
        className,
      )}
    >
      <div>
        <h1
          className={cn('text-3xl font-bold text-foreground', description && 'mb-2', titleClassName)}
        >
          {title}
        </h1>
        {description && <p className="text-muted-foreground text-sm">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
