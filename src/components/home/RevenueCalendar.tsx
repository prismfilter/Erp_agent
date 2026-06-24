'use client';

// 홈 피드 월별 매출 달력 — 순매출 막대바. +수입(초록) / −환입(빨강). 누적 박스 없음(히어로가 담당).
import { formatCompactWon } from '@/lib/home/format';

interface RevenueCalendarProps {
  monthly: { month: number; total: number }[];
}

export function RevenueCalendar({ monthly }: RevenueCalendarProps) {
  // 0 division 방지 — 모두 0인 경우 max=1로 고정
  const max = Math.max(1, ...monthly.map((m) => Math.abs(m.total)));

  return (
    <section className="rounded-xl border border-border bg-card px-5 py-4 shadow-sm">
      {/* 카드 헤더 */}
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-extrabold text-foreground">매출 달력</h3>
        <span className="text-[11px] font-semibold text-muted-foreground">
          월별 순매출 · +수입(초록) / −환입(빨강)
        </span>
      </div>

      {/* 2열 그리드: 12개 월 행 */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-2">
        {monthly.map((m) => {
          const isNeg = m.total < 0;
          // 막대 폭: 절댓값 기준 비율 (0~100%)
          const pct = Math.max(0, (Math.abs(m.total) / max) * 100);

          return (
            <div
              key={m.month}
              className="flex items-center rounded-lg border border-border bg-background px-3 py-2"
            >
              {/* 월 라벨 */}
              <span className="w-8 flex-none text-[11.5px] font-bold text-muted-foreground">
                {m.month}월
              </span>

              {/* 막대 트랙 */}
              <div className="mx-2.5 h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${pct}%`,
                    // 음수: 빨강 그라디언트 / 양수: primary 계열 그라디언트
                    background: isNeg
                      ? 'linear-gradient(90deg,#f87171,#fca5a5)'
                      : 'linear-gradient(90deg,var(--primary),#b9a6ff)',
                  }}
                />
              </div>

              {/* 금액: 양수 초록·음수 빨강, 양수에만 + 접두사 */}
              <span
                className={`w-14 flex-none text-right text-[11px] font-extrabold ${
                  isNeg ? 'text-red-600' : 'text-emerald-600'
                }`}
              >
                {m.total > 0 ? '+' : ''}
                {formatCompactWon(m.total)}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
