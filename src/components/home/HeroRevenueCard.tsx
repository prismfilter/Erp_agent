'use client';

// 홈 피드 히어로 — 올해 누적 수입 강조. 전년대비 YoY + 월별 스파크라인.
import { formatWon } from '@/lib/settlement/calculator';
import { calcYoY } from '@/lib/revenue/aggregator';

interface HeroRevenueCardProps {
  year: number;
  total: number;       // 올해 누적 귀속금액
  prevTotal: number;   // 전년 동기 누적
  monthly: { month: number; total: number }[]; // 스파크라인용 1~12월
}

export function HeroRevenueCard({ year, total, prevTotal, monthly }: HeroRevenueCardProps) {
  // 전년 대비 증감률 — 전년 0이면 null(비교 불가)
  const yoy = calcYoY(total, prevTotal);
  const max = Math.max(1, ...monthly.map((m) => m.total));
  const avg = total > 0 ? Math.round(total / 12) : 0;

  return (
    <section className="rounded-2xl border border-border bg-card px-6 py-4 shadow-sm">
      <p className="text-sm font-semibold text-muted-foreground">올해 누적 수입 ({year})</p>
      <p className="mt-1 text-[32px] font-extrabold leading-none tracking-tight text-foreground">
        {formatWon(total)}
      </p>
      <p className="mt-1.5 text-[13px] font-semibold text-muted-foreground">
        {yoy !== null ? (
          <span className={yoy >= 0 ? 'text-emerald-500' : 'text-red-500'}>
            {yoy >= 0 ? '▲' : '▼'} 전년 동기 대비 {yoy >= 0 ? '+' : ''}
            {yoy.toFixed(1)}%
          </span>
        ) : (
          '전년 데이터 없음'
        )}
        {' · 월평균 '}
        {formatWon(avg)}
      </p>
      {/* 월별 스파크라인 — primary 틴트 막대(카드 배경 위) */}
      <div className="mt-3 flex h-8 items-end gap-1.5">
        {monthly.map((m) => (
          <div
            key={m.month}
            className="flex-1 rounded-t bg-primary/30"
            style={{ height: `${Math.max(6, (m.total / max) * 100)}%` }}
            title={`${m.month}월 ${formatWon(m.total)}`}
          />
        ))}
      </div>
    </section>
  );
}
