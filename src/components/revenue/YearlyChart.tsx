'use client';

// 연도별 매출 비교 세로 막대 차트 — 선택 연도 강조, 막대 클릭으로 연도 전환

import { useMemo } from 'react';
import type { RevenueData } from '@/lib/revenue/aggregator';
import { formatWon } from '@/lib/settlement/calculator';
import { useChartTooltip, ChartTooltip, type TooltipContent } from './ChartTooltip';

interface YearlyChartProps {
  data: RevenueData;
  selectedYear: number;
  onSelectYear: (year: number) => void;
}

const CHART_HEIGHT = 220; // px

export function YearlyChart({ data, selectedYear, onSelectYear }: YearlyChartProps) {
  const { state: tip, show, move, hide } = useChartTooltip();

  // 호버 핸들러 — active일 때만(막대 있으면 막대에, 없으면 연도 라벨에)
  const hoverProps = (content: TooltipContent, active: boolean) =>
    active
      ? { onMouseEnter: (e: React.MouseEvent) => show(e, content), onMouseMove: move, onMouseLeave: hide }
      : undefined;

  // 오름차순 표시 (과거 → 현재), 데이터 없으면 선택 연도만
  const years = useMemo(() => {
    const ys = [...data.years].sort((a, b) => a - b);
    if (!ys.includes(selectedYear)) ys.push(selectedYear);
    return ys.sort((a, b) => a - b);
  }, [data.years, selectedYear]);

  const maxValue = useMemo(
    () => Math.max(...years.map((y) => data.byYear[y] ?? 0), 1),
    [years, data.byYear]
  );

  return (
    <div className="bg-card border border-border rounded-lg p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-foreground">연도별 매출 비교</h3>
        <span className="text-xs text-muted-foreground">막대 클릭으로 연도 전환</span>
      </div>

      <div className="flex items-end justify-around gap-3" style={{ height: CHART_HEIGHT + 56 }}>
        {years.map((y) => {
          const total = data.byYear[y] ?? 0;
          const isSelected = y === selectedYear;
          const h = Math.max(total > 0 ? 6 : 0, (total / maxValue) * CHART_HEIGHT);
          const content: TooltipContent = { title: `${y}년`, value: formatWon(total) };

          return (
            <button
              key={y}
              type="button"
              onClick={() => onSelectYear(y)}
              className="flex-1 max-w-[120px] flex flex-col items-center justify-end gap-1 cursor-pointer h-full"
            >
              <span className={`text-[10px] tabular-nums ${isSelected ? 'text-foreground' : 'text-muted-foreground'}`}>
                {total > 0 ? formatWon(total) : '-'}
              </span>
              <div
                {...hoverProps(content, total > 0)}
                className="w-2/3 max-w-[56px] rounded-t-md transition-all duration-300 hover:brightness-110"
                style={{
                  height: h,
                  background: isSelected
                    ? 'linear-gradient(180deg, var(--chart-bar-from, #8097ff) 0%, var(--chart-bar-to, #4a5ee8) 100%)'
                    : 'linear-gradient(180deg, var(--chart-bar-dim-from, #5a6699) 0%, var(--chart-bar-dim-to, #3a4170) 100%)',
                  opacity: isSelected ? 1 : 0.6,
                  boxShadow: isSelected ? '0 0 16px var(--chart-glow, rgba(74, 94, 232, 0.55))' : 'none',
                }}
              />
              <span
                {...hoverProps(content, total === 0)}
                className={`text-xs font-semibold ${isSelected ? 'text-primary' : 'text-muted-foreground'}`}
              >
                {y}
              </span>
            </button>
          );
        })}
      </div>

      <ChartTooltip state={tip} />
    </div>
  );
}
