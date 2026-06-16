'use client';

// 분기별 / 월별 매출 세로 막대 차트
// - 헤더의 [분기별]·[월별] 탭으로 전환
// - 분기: 4막대, 클릭 시 분기 선택 / compare 시 전년 동분기 막대 나란히
// - 월별: 1~12월 막대(분기 절반 두께), compare 시 전년 동월 막대를 다른 색·반투명으로 겹쳐 표시(표시 전용)

import { useMemo, useState } from 'react';
import type { RevenueData } from '@/lib/revenue/aggregator';
import { getQuarter, getMonth } from '@/lib/revenue/aggregator';
import { formatWon } from '@/lib/settlement/calculator';
import { useChartTooltip, ChartTooltip, type TooltipContent } from './ChartTooltip';

interface QuarterlyChartProps {
  data: RevenueData;
  year: number;
  selectedQuarter: number | null; // null = 전체
  compare: boolean;
  onSelectQuarter: (q: number | null) => void;
}

const CHART_HEIGHT = 220; // px
const MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

export function QuarterlyChart({ data, year, selectedQuarter, compare, onSelectQuarter }: QuarterlyChartProps) {
  const [view, setView] = useState<'quarter' | 'month'>('quarter');
  const { state: tip, show, move, hide } = useChartTooltip();
  const quarters = [1, 2, 3, 4];

  // 호버 핸들러 — active일 때만 부여(막대가 있으면 막대에, 없으면 라벨에)
  const hoverProps = (content: TooltipContent, active: boolean) =>
    active
      ? { onMouseEnter: (e: React.MouseEvent) => show(e, content), onMouseMove: move, onMouseLeave: hide }
      : undefined;

  // 분기 막대 높이 기준: 현재 연도 + (compare 시) 전년도 중 최대값
  const maxQuarter = useMemo(() => {
    let max = 0;
    quarters.forEach((q) => {
      max = Math.max(max, getQuarter(data, year, q).total);
      if (compare) max = Math.max(max, getQuarter(data, year - 1, q).total);
    });
    return max || 1;
  }, [data, year, compare]); // eslint-disable-line react-hooks/exhaustive-deps

  // 월별 막대 높이 기준: 선택 연도 12개월 + (compare 시) 전년도 중 최대값
  const maxMonth = useMemo(() => {
    let max = 0;
    MONTHS.forEach((m) => {
      max = Math.max(max, getMonth(data, year, m).total);
      if (compare) max = Math.max(max, getMonth(data, year - 1, m).total);
    });
    return max || 1;
  }, [data, year, compare]);

  const barHeight = (value: number, max: number) =>
    Math.max(value > 0 ? 6 : 0, (value / max) * CHART_HEIGHT);

  return (
    <div className="bg-card border border-border rounded-lg p-5">
      {/* 헤더: [분기별]·[월별] 탭 + 연도 표기 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-1">
          {([
            ['quarter', '분기별'],
            ['month', '월별'],
          ] as const).map(([v, label]) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              className={`text-sm font-bold px-2 py-1 rounded-md transition cursor-pointer ${
                view === v ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {label} 매출
            </button>
          ))}
        </div>
        <span className="text-xs text-muted-foreground">
          {year}년{compare && ` vs ${year - 1}년`}
        </span>
      </div>

      {view === 'quarter' ? (
        /* ===== 분기별 ===== */
        <div className="flex items-end justify-around gap-2" style={{ height: CHART_HEIGHT + 56 }}>
          {quarters.map((q) => {
            const cur = getQuarter(data, year, q);
            const prev = compare ? getQuarter(data, year - 1, q) : null;
            const isSelected = selectedQuarter === null || selectedQuarter === q;
            const content: TooltipContent = {
              title: `${year}년 Q${q}`,
              value: formatWon(cur.total),
              sub: `${cur.count}건`,
              compare: prev ? { label: `${year - 1}년 Q${q}`, value: formatWon(prev.total) } : undefined,
            };
            const hasBar = cur.total > 0 || (!!prev && prev.total > 0);

            return (
              <button
                key={q}
                type="button"
                onClick={() => onSelectQuarter(selectedQuarter === q ? null : q)}
                className="flex-1 flex flex-col items-center justify-end gap-1 cursor-pointer h-full"
              >
                <span className={`text-[10px] tabular-nums transition ${isSelected ? 'text-foreground' : 'text-muted-foreground'}`}>
                  {cur.total > 0 ? formatWon(cur.total) : '-'}
                </span>

                <div className="flex items-end gap-1 w-full justify-center">
                  <div
                    {...hoverProps(content, cur.total > 0)}
                    className="w-1/3 max-w-[44px] rounded-t-md transition-all duration-300 hover:brightness-110"
                    style={{
                      height: barHeight(cur.total, maxQuarter),
                      background: 'linear-gradient(180deg, #8097ff 0%, #4a5ee8 100%)',
                      opacity: isSelected ? 1 : 0.4,
                      boxShadow: selectedQuarter === q ? '0 0 16px rgba(74, 94, 232, 0.55)' : 'none',
                    }}
                  />
                  {prev && (
                    <div
                      {...hoverProps(content, prev.total > 0)}
                      className="w-1/3 max-w-[44px] rounded-t-md"
                      style={{
                        height: barHeight(prev.total, maxQuarter),
                        background: 'linear-gradient(180deg, #8896cc 0%, #4a5474 100%)',
                        opacity: 0.35,
                      }}
                    />
                  )}
                </div>

                <span
                  {...hoverProps(content, !hasBar)}
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
      ) : (
        /* ===== 월별 (1~12월, 분기 절반 두께, compare 시 전년 오버레이) ===== */
        <div className="flex items-end justify-around gap-0.5" style={{ height: CHART_HEIGHT + 36 }}>
          {MONTHS.map((m) => {
            const cur = getMonth(data, year, m);
            const prev = compare ? getMonth(data, year - 1, m) : null;
            const content: TooltipContent = {
              title: `${year}년 ${m}월`,
              value: formatWon(cur.total),
              sub: `${cur.count}건`,
              compare: prev ? { label: `${year - 1}년 ${m}월`, value: formatWon(prev.total) } : undefined,
            };
            const hasBar = cur.total > 0 || (!!prev && prev.total > 0);

            return (
              <div
                key={m}
                className="flex-1 flex flex-col items-center justify-end gap-1.5 h-full"
              >
                {/* 막대 영역 — 컬럼 절반 폭(분기 막대의 약 절반 두께)
                    전년 막대(반투명·뒤) 위에 현재 연도 막대(solid·앞)를 겹쳐, 현재 막대는 또렷·전년은 위로 비침 */}
                <div className="relative w-1/2 max-w-[22px]" style={{ height: CHART_HEIGHT }}>
                  {/* 전년 동월 (다른 색·반투명 오버레이, 뒤) */}
                  {prev && (
                    <div
                      {...hoverProps(content, prev.total > 0)}
                      className="absolute bottom-0 left-0 right-0 rounded-t-[3px] border border-amber-300/70"
                      style={{
                        height: barHeight(prev.total, maxMonth),
                        background: 'linear-gradient(180deg, #fbbf24 0%, #d97706 100%)',
                        opacity: 0.55,
                      }}
                    />
                  )}
                  {/* 현재 연도 (solid, 앞) */}
                  <div
                    {...hoverProps(content, cur.total > 0)}
                    className="absolute bottom-0 left-0 right-0 rounded-t-[3px] transition-all duration-300 hover:brightness-110"
                    style={{
                      height: barHeight(cur.total, maxMonth),
                      background: 'linear-gradient(180deg, #8097ff 0%, #4a5ee8 100%)',
                    }}
                  />
                </div>

                {/* 월 라벨 (막대 없을 때 호버 대상) */}
                <span
                  {...hoverProps(content, !hasBar)}
                  className="text-[10px] text-muted-foreground tabular-nums"
                >
                  {m}
                </span>
              </div>
            );
          })}
        </div>
      )}

      <ChartTooltip state={tip} />
    </div>
  );
}
