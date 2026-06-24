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
    <section className="home-hero relative overflow-hidden rounded-2xl px-7 py-6 text-primary-foreground shadow-sm">
      {/* 장식용 반투명 원 */}
      <div className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full bg-white/10" />
      <p className="text-sm font-semibold opacity-90">올해 누적 수입 ({year})</p>
      <p className="mt-1.5 text-[42px] font-extrabold leading-none tracking-tight">
        {formatWon(total)}
      </p>
      <p className="mt-2 text-[13px] font-semibold opacity-95">
        {yoy !== null
          ? `${yoy >= 0 ? '▲' : '▼'} 전년 동기 대비 ${yoy >= 0 ? '+' : ''}${yoy.toFixed(1)}% · `
          : '전년 데이터 없음 · '}
        월평균 {formatWon(avg)}
      </p>
      {/* 월별 스파크라인 — 막대 높이는 최대값 대비 비율 */}
      <div className="mt-4 flex h-12 items-end gap-1.5">
        {monthly.map((m) => (
          <div
            key={m.month}
            className="flex-1 rounded-t bg-white/45"
            style={{ height: `${Math.max(6, (m.total / max) * 100)}%` }}
            title={`${m.month}월 ${formatWon(m.total)}`}
          />
        ))}
      </div>
    </section>
  );
}
