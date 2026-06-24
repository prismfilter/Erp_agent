'use client';

// 홈 피드 캘린더형 달력 — 일별 매출 + 전년 동기 대비 %. 월 네비(좌우 화살표) + 연·월 선택 팝오버 포함.

import { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { buildCalendarCells, type CalendarCell } from '@/lib/revenue/aggregator';
import { formatCompactWon } from '@/lib/home/format';

// byDay: aggregateRevenue 결과의 data.byDay ('YYYY-MM-DD' → 매출·건수)
// years: 데이터 존재 연도 목록 (팝오버 연도 선택에서 사용)
interface RevenueCalendarMonthProps {
  byDay: Record<string, { total: number; count: number }>;
  years: number[];
}

// 요일 헤더 라벨 (일~토)
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'] as const;

export function RevenueCalendarMonth({ byDay, years }: RevenueCalendarMonthProps) {
  const now = new Date();

  // 선택된 연/월 상태 (초기값: 현재 연/월)
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1); // 1~12

  // 팝오버 열림 상태 + 2단계(year → month)
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerStep, setPickerStep] = useState<'year' | 'month'>('year');
  const pickerRef = useRef<HTMLDivElement>(null);

  // 외부 클릭 시 팝오버 닫힘 (revenue/page.tsx 패턴)
  useEffect(() => {
    if (!pickerOpen) return;
    const onDown = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setPickerOpen(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [pickerOpen]);

  // 선택 가능한 연도 목록: 데이터 연도 ∪ 최근 3년, 내림차순
  const yearOptions = Array.from(
    new Set([...years, selectedYear, selectedYear - 1, selectedYear - 2]),
  ).sort((a, b) => b - a);

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
      {/* 헤더: 이전달 화살표 / 연월 팝오버 버튼 / 다음달 화살표 */}
      <div className="flex items-center justify-between px-4 pt-4">
        <button
          type="button"
          onClick={prevMonth}
          aria-label="이전 달"
          className="rounded p-1 text-muted-foreground hover:bg-primary/10 hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        {/* 연·월 선택 팝오버 — 클릭 시 연도 단계 → 연도 선택 후 월 단계 → 월 선택 시 닫힘 */}
        <div ref={pickerRef} className="relative">
          <button
            type="button"
            onClick={() => { setPickerStep('year'); setPickerOpen((v) => !v); }}
            className="rounded px-2 py-1 text-sm font-bold text-foreground hover:bg-primary/10"
          >
            {selectedYear}년 {selectedMonth}월
          </button>

          {pickerOpen && (
            <div className="absolute left-1/2 top-full z-20 mt-1 w-48 -translate-x-1/2 rounded-lg border border-border bg-card p-2 shadow-lg">
              {pickerStep === 'year' ? (
                /* 연도 선택 그리드 */
                <div className="grid grid-cols-3 gap-1">
                  {yearOptions.map((y) => (
                    <button
                      key={y}
                      type="button"
                      onClick={() => { setSelectedYear(y); setPickerStep('month'); }}
                      className={`rounded px-2 py-1.5 text-xs ${
                        y === selectedYear
                          ? 'bg-primary/15 font-bold text-foreground'
                          : 'text-muted-foreground hover:bg-primary/10'
                      }`}
                    >
                      {y}
                    </button>
                  ))}
                </div>
              ) : (
                /* 월 선택 그리드 */
                <div className="grid grid-cols-4 gap-1">
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => { setSelectedMonth(m); setPickerOpen(false); setPickerStep('year'); }}
                      className={`rounded px-2 py-1.5 text-xs ${
                        m === selectedMonth
                          ? 'bg-primary/15 font-bold text-foreground'
                          : 'text-muted-foreground hover:bg-primary/10'
                      }`}
                    >
                      {m}월
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

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
