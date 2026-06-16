'use client';

// 카테고리별 매출 가로 막대 차트 — compare 시 각 막대 바로 아래 전년도 반투명 막대

import { useMemo } from 'react';
import type { RevenueData } from '@/lib/revenue/aggregator';
import { REVENUE_CATEGORIES } from '@/lib/revenue/aggregator';
import { formatWon } from '@/lib/settlement/calculator';
import { useChartTooltip, ChartTooltip, type TooltipContent } from './ChartTooltip';

interface CategoryBarChartProps {
  data: RevenueData;
  year: number;
  compare: boolean;
}

export function CategoryBarChart({ data, year, compare }: CategoryBarChartProps) {
  const { state: tip, show, move, hide } = useChartTooltip();

  // 호버 핸들러 — 막대(fill)가 있을 때만 부여
  const hoverProps = (content: TooltipContent, active: boolean) =>
    active
      ? { onMouseEnter: (e: React.MouseEvent) => show(e, content), onMouseMove: move, onMouseLeave: hide }
      : undefined;

  // 표시할 카테고리: 고정 순서 중 데이터(현재·전년)가 있는 것만
  const rows = useMemo(() => {
    return REVENUE_CATEGORIES.map((cat) => ({
      category: cat,
      current: data.byCategory[cat]?.[year] ?? 0,
      previous: data.byCategory[cat]?.[year - 1] ?? 0,
    })).filter((r) => r.current !== 0 || (compare && r.previous !== 0));
  }, [data.byCategory, year, compare]);

  const maxValue = useMemo(() => {
    let max = 0;
    rows.forEach((r) => {
      max = Math.max(max, Math.abs(r.current));
      if (compare) max = Math.max(max, Math.abs(r.previous));
    });
    return max || 1;
  }, [rows, compare]);

  const widthPct = (value: number) => Math.max(value !== 0 ? 1.5 : 0, (Math.abs(value) / maxValue) * 100);

  return (
    <div className="bg-card border border-border rounded-lg p-5">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-sm font-bold text-foreground">카테고리별 매출</h3>
        <span className="text-xs text-muted-foreground">
          {year}년{compare && ` vs ${year - 1}년`} · 프라이스 테이블 기준
        </span>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">
          해당 연도의 매출 데이터가 없습니다.
        </p>
      ) : (
        <div className="space-y-4">
          {rows.map((r) => (
            <div key={r.category}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-foreground">{r.category}</span>
                <span className="text-xs tabular-nums text-foreground">{formatWon(r.current)}</span>
              </div>
              {/* 현재 연도 막대 — fill(실제 막대)에만 호버 */}
              <div className="h-5 bg-muted/40 rounded-md overflow-hidden">
                <div
                  {...hoverProps({ title: `${year}년 · ${r.category}`, value: formatWon(r.current) }, r.current !== 0)}
                  className="h-full rounded-md transition-all duration-500"
                  style={{
                    width: `${widthPct(r.current)}%`,
                    background: 'linear-gradient(90deg, #4a5ee8 0%, #8097ff 100%)',
                  }}
                />
              </div>
              {/* compare: 전년도 반투명 막대 (바로 아래) */}
              {compare && (
                <div className="h-4 mt-1 bg-muted/20 rounded-md overflow-hidden flex items-center">
                  <div
                    {...hoverProps({ title: `${year - 1}년 · ${r.category}`, value: formatWon(r.previous) }, r.previous !== 0)}
                    className="h-full rounded-md"
                    style={{
                      width: `${widthPct(r.previous)}%`,
                      background: 'linear-gradient(90deg, #4a5474 0%, #8896cc 100%)',
                      opacity: 0.4,
                    }}
                  />
                  <span className="text-[10px] text-muted-foreground tabular-nums ml-2 flex-shrink-0">
                    {year - 1}년 {formatWon(r.previous)}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <ChartTooltip state={tip} />
    </div>
  );
}
