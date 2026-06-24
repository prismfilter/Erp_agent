'use client';

// 홈 피드 순위 위젯 — 순위·이름·막대·금액의 가로 랭킹 리스트(작가 정산/거래처 매출 공용).
// 막대 정렬: CSS Grid로 이름을 한 컬럼(auto)에 묶어 모든 행의 막대 시작점을 정렬.
// 이름은 최대 15글자, 초과 시 …로 표기.
import { Fragment } from 'react';
import { formatCompactWon } from '@/lib/home/format';

interface RankingItem {
  name: string;
  amount: number;
}

interface RankingListProps {
  title: string;
  subtitle?: string;
  items: RankingItem[];
  limit?: number; // 상위 N개만 표시(기본 5)
  emptyText?: string;
}

// 이름 15글자 초과 시 … 로 표기
function clampName(name: string): string {
  return name.length > 15 ? `${name.slice(0, 15)}…` : name;
}

export function RankingList({
  title,
  subtitle,
  items,
  limit = 5,
  emptyText = '데이터가 없습니다.',
}: RankingListProps) {
  const top = items.slice(0, limit);
  const max = Math.max(1, ...top.map((i) => i.amount));

  return (
    <section className="flex flex-col rounded-xl border border-border bg-card shadow-sm">
      <div className="px-5 pt-3">
        <h3 className="text-sm font-extrabold text-foreground">{title}</h3>
        {subtitle && <p className="mt-0.5 text-[11.5px] text-muted-foreground">{subtitle}</p>}
      </div>

      {top.length === 0 ? (
        <div className="flex flex-1 items-center justify-center px-5 py-3">
          <p className="text-sm text-muted-foreground">{emptyText}</p>
        </div>
      ) : (
        // 4컬럼: 순위(auto) · 이름(auto — 모든 행 동일폭으로 막대 시작점 정렬) · 막대(1fr) · 금액(auto)
        <div className="grid flex-1 grid-cols-[auto_auto_1fr_auto] content-center items-center gap-x-3 gap-y-2.5 px-5 py-3">
          {top.map((it, i) => (
            <Fragment key={it.name}>
              <span className="text-center text-xs font-bold text-muted-foreground">{i + 1}</span>
              <span className="whitespace-nowrap text-[13px] text-foreground" title={it.name}>
                {clampName(it.name)}
              </span>
              <div className="h-2 min-w-[24px] overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${(it.amount / max) * 100}%`,
                    background: 'linear-gradient(90deg, var(--primary), #b9a6ff)',
                  }}
                />
              </div>
              <b className="text-right text-[12px] font-extrabold text-foreground">
                {formatCompactWon(it.amount)}
              </b>
            </Fragment>
          ))}
        </div>
      )}
    </section>
  );
}
