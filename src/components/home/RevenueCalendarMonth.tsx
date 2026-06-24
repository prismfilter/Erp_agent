'use client';

// 홈 피드 캘린더형 달력 — 일별 매출 + 전년 동기 대비 %. 월 네비(좌우 화살표) 포함.
// years prop은 T3 팝오버(연도 선택)에서 사용 예정.

import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { buildCalendarCells, type CalendarCell } from '@/lib/revenue/aggregator';
import { formatCompactWon } from '@/lib/home/format';

// byDay: aggregateRevenue 결과의 data.byDay ('YYYY-MM-DD' → 매출·건수)
// years: 데이터 존재 연도 목록 (T3 팝오버에서 사용 예정)
interface RevenueCalendarMonthProps {
  byDay: Record<string, { total: number; count: number }>;
  years: number[];
}

// 요일 헤더 라벨 (일~토)
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'] as const;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function RevenueCalendarMonth({ byDay, years }: RevenueCalendarMonthProps) {
  const now = new Date();

  // 선택된 연/월 상태 (초기값: 현재 연/월)
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1); // 1~12

  // 달력 셀 배열 (앞 오프셋 null + 날짜 셀 + 뒤 패딩 null, 7배수)
  const cells: CalendarCell[] = buildCalendarCells(byDay, selectedYear, selectedMonth);

  // 이전 달 이동 (1월이면 전년 12월로)
  const prevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedYear((y) => y - 1);
      setSelectedMonth(12);
    } else {
      setSelectedMonth((m) => m - 1);
    }
  };

  // 다음 달 이동 (12월이면 익년 1월로)
  const nextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedYear((y) => y + 1);
      setSelectedMonth(1);
    } else {
      setSelectedMonth((m) => m + 1);
    }
  };

  // 오늘 날짜 셀 여부 판별
  const isToday = (day: number): boolean =>
    selectedYear === now.getFullYear() &&
    selectedMonth === now.getMonth() + 1 &&
    day === now.getDate();

  return (
    <section className="flex flex-col rounded-xl border border-border bg-card shadow-sm">
      {/* 헤더: 이전달 화살표 / 연월 텍스트 / 다음달 화살표 */}
      <div className="flex items-center justify-between px-4 pt-4">
        <button
          type="button"
          onClick={prevMonth}
          aria-label="이전 달"
          className="rounded p-1 text-muted-foreground hover:bg-primary/10 hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        {/* T3에서 클릭 시 연도/월 팝오버로 교체 예정 — 현재는 일반 텍스트 */}
        <span className="text-sm font-bold text-foreground">
          {selectedYear}년 {selectedMonth}월
        </span>

        <button
          type="button"
          onClick={nextMonth}
          aria-label="다음 달"
          className="rounded p-1 text-muted-foreground hover:bg-primary/10 hover:text-foreground"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* 요일 헤더 (일=빨강, 토=파랑, 평일=muted) */}
      <div className="grid grid-cols-7 px-3 pt-3 text-center text-[11px] font-semibold">
        {WEEKDAYS.map((w, i) => (
          <div
            key={w}
            className={
              i === 0
                ? 'text-red-500'
                : i === 6
                  ? 'text-blue-500'
                  : 'text-muted-foreground'
            }
          >
            {w}
          </div>
        ))}
      </div>

      {/* 날짜 그리드 — flex-1로 카드 높이 채움 */}
      <div className="grid flex-1 grid-cols-7 gap-1 px-3 pb-3 pt-1">
        {cells.map((cell, i) => {
          // null 셀: 앞뒤 패딩 빈칸
          if (!cell) return <div key={i} />;

          const today = isToday(cell.day);

          return (
            <div
              key={i}
              className={`flex min-h-[44px] flex-col items-center rounded-md px-0.5 py-1 ${
                today ? 'bg-primary/10' : ''
              }`}
            >
              {/* 날짜 숫자 */}
              <span className="text-[11px] text-foreground">{cell.day}</span>

              {/* 당일 매출 (0원 초과 시 표시) */}
              {cell.total > 0 && (
                <span className="mt-0.5 text-[9px] font-bold text-emerald-500">
                  +{formatCompactWon(cell.total)}
                </span>
              )}

              {/* 전년 동기 대비 % (null이면 비표시, 양수=emerald, 음수=red) */}
              {cell.yoy !== null && (
                <span
                  className={`text-[9px] font-semibold ${
                    cell.yoy >= 0 ? 'text-emerald-500' : 'text-red-500'
                  }`}
                >
                  {cell.yoy >= 0 ? '+' : ''}
                  {Math.round(cell.yoy)}%
                </span>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
