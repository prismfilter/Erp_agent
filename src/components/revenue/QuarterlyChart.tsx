'use client';

// 분기별 매출 세로 막대 차트 — 선택 분기 강조, compare 시 전년 동분기 반투명 막대 나란히

import { useMemo } from 'react';
import type { RevenueData } from '@/lib/revenue/aggregator';
import { getQuarter } from '@/lib/revenue/aggregator';
import { formatWon } from '@/lib/settlement/calculator';

interface QuarterlyChartProps {
  data: RevenueData;
  year: number;
  selectedQuarter: number | null; // null = 전체
  compare: boolean;
  onSelectQuarter: (q: number | null) => void;
}

const CHART_HEIGHT = 220; // px

export function QuarterlyChart({ data, year, selectedQuarter, compare, onSelectQuarter }: QuarterlyChartProps) {
  const quarters = [1, 2, 3, 4];

  // 막대 높이 비율 기준: 현재 연도 + (compare 시) 전년도 중 최대값
  const maxValue = useMemo(() => {
    let max = 0;
    quarters.forEach((q) => {
      max = Math.max(max, getQuarter(data, year, q).total);
      if (compare) max = Math.max(max, getQuarter(data, year - 1, q).total);
    });
    return max || 1;
  }, [data, year, compare]); // eslint-disable-line react-hooks/exhaustive-deps

  const barHeight = (value: number) => Math.max(value > 0 ? 6 : 0, (value / maxValue) * CHART_HEIGHT);

  return (
    <div className="bg-card border border-border rounded-lg p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-foreground">분기별 매출</h3>
        <span className="text-xs text-muted-foreground">
          {year}년{compare && ` vs ${year - 1}년`}
        </span>
      </div>

      <div className="flex items-end justify-around gap-2" style={{ height: CHART_HEIGHT + 56 }}>
        {quarters.map((q) => {
          const cur = getQuarter(data, year, q);
          const prev = compare ? getQuarter(data, year - 1, q) : null;
          const isSelected = selectedQuarter === null || selectedQuarter === q;

          return (
            <button
              key={q}
              type="button"
              onClick={() => onSelectQuarter(selectedQuarter === q ? null : q)}
              className="flex-1 flex flex-col items-center justify-end gap-1 cursor-pointer group h-full"
              title={`${year}년 Q${q}: ${formatWon(cur.total)} (${cur.count}건)${prev ? `\n${year - 1}년 Q${q}: ${formatWon(prev.total)}` : ''}`}
            >
              {/* 금액 라벨 */}
              <span className={`text-[10px] tabular-nums transition ${isSelected ? 'text-foreground' : 'text-muted-foreground'}`}>
                {cur.total > 0 ? formatWon(cur.total) : '-'}
              </span>

              {/* 막대 (현재 연도 + compare 전년) */}
              <div className="flex items-end gap-1 w-full justify-center">
                <div
                  className="w-1/3 max-w-[44px] rounded-t-md transition-all duration-300 group-hover:brightness-110"
                  style={{
                    height: barHeight(cur.total),
                    background: 'linear-gradient(180deg, #8097ff 0%, #4a5ee8 100%)',
                    opacity: isSelected ? 1 : 0.4,
                    boxShadow: selectedQuarter === q ? '0 0 16px rgba(74, 94, 232, 0.55)' : 'none',
                  }}
                />
                {prev && (
                  <div
                    className="w-1/3 max-w-[44px] rounded-t-md"
                    style={{
                      height: barHeight(prev.total),
                      background: 'linear-gradient(180deg, #8896cc 0%, #4a5474 100%)',
                      opacity: 0.35,
                    }}
                    title={`${year - 1}년 Q${q}: ${formatWon(prev.total)}`}
                  />
                )}
              </div>

              {/* 분기 라벨 */}
              <span
                className={`text-xs font-semibold transition ${
                  selectedQuarter === q ? 'text-primary' : isSelected ? 'text-foreground' : 'text-muted-foreground'
                }`}
              >
                Q{q}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
