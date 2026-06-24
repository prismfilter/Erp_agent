'use client';

// 홈 피드 카테고리 도넛 — 실제 매출 카테고리(귀속금액) 구성.
// 합계는 히어로 '올해 누적 수입'(청구서 귀속금액)과 일치.
import { formatCompactWon } from '@/lib/home/format';

interface CategoryDonutProps {
  slices: { category: string; amount: number }[];
}

// 카테고리별 고정 색상 팔레트 — 색이 없는 카테고리는 fallback(#94a3b8)
const CATEGORY_COLORS: Record<string, string> = {
  '앨범': 'var(--primary)',
  '방송·공연·시상식': '#34d399',
  '광고': '#fbbf24',
  '기타': '#f472b6',
  '밴드': '#60a5fa',
  '밴드(플레디스)': '#a78bfa',
  '커스텀': '#94a3b8',
};

const FALLBACK_COLOR = '#94a3b8';

// 카테고리별 그라데이션(밝은→진한) — 도넛 세그먼트에 입체감 부여
const CATEGORY_GRADIENTS: Record<string, [string, string]> = {
  '앨범': ['var(--primary)', 'var(--accent)'],
  '방송·공연·시상식': ['#5eead4', '#0d9488'],
  '광고': ['#fcd34d', '#d97706'],
  '기타': ['#f9a8d4', '#db2777'],
  '밴드': ['#93c5fd', '#2563eb'],
  '밴드(플레디스)': ['#c4b5fd', '#7c3aed'],
  '커스텀': ['#cbd5e1', '#64748b'],
};

const FALLBACK_GRADIENT: [string, string] = ['#cbd5e1', '#64748b'];

// 둘레 100 정규화 반지름 (2πr = 100 → r ≈ 15.915)
const R = 15.915;
const CIRC = 100;

export function CategoryDonut({ slices }: CategoryDonutProps) {
  const total = slices.reduce((s, b) => s + b.amount, 0);

  // 세그먼트 offset 누적: 12시 방향 시작(offset=25)
  let offset = 25;

  return (
    <section className="flex flex-col rounded-xl border border-border bg-card shadow-sm">
      {/* 카드 헤더 */}
      <div className="px-6 pt-5">
        <h3 className="text-sm font-extrabold text-foreground">카테고리별 매출</h3>
        <p className="mt-0.5 text-[11.5px] text-muted-foreground">올해 매출 구성</p>
      </div>

      {/* 도넛(위) + 범례(아래 전체폭) — 좁고 긴 카드의 세로 여백을 채우도록 세로 중앙 정렬 */}
      <div className="flex flex-1 flex-col items-center justify-center gap-7 px-6 py-6">
        {/* SVG 도넛 — stroke-dasharray 방식, 반지름 R로 둘레 100 정규화 */}
        <svg width="152" height="152" viewBox="0 0 42 42" className="flex-none">
          {/* 카테고리별 그라데이션 정의 — 세그먼트마다 밝은→진한 */}
          {total > 0 && (
            <defs>
              {slices.map((b, i) => {
                const [from, to] = CATEGORY_GRADIENTS[b.category] ?? FALLBACK_GRADIENT;
                return (
                  <linearGradient key={i} id={`donut-grad-${i}`} x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor={from} />
                    <stop offset="100%" stopColor={to} />
                  </linearGradient>
                );
              })}
            </defs>
          )}
          {/* 배경 트랙 — 항상 표시 */}
          <circle
            cx="21"
            cy="21"
            r={R}
            fill="none"
            stroke="var(--muted)"
            strokeWidth="6"
          />

          {/* 데이터 세그먼트 — 합계 0이면 렌더 생략(0 division 방지) */}
          {total > 0 &&
            slices.map((b, i) => {
              const pct = (b.amount / total) * CIRC;
              const dash = `${pct} ${CIRC - pct}`;
              // offset은 현재 시작 위치, 렌더 후 다음 세그먼트 위해 감소
              const seg = (
                <circle
                  key={b.category}
                  cx="21"
                  cy="21"
                  r={R}
                  fill="none"
                  stroke={`url(#donut-grad-${i})`}
                  strokeWidth="6"
                  strokeDasharray={dash}
                  strokeDashoffset={offset}
                />
              );
              offset -= pct;
              return seg;
            })}

          {/* 중앙 합계 — 히어로 누적 수입과 일치 */}
          <text
            x="21"
            y="20"
            textAnchor="middle"
            fontSize="4.4"
            fontWeight="800"
            fill="var(--foreground)"
          >
            {formatCompactWon(total)}
          </text>
          <text
            x="21"
            y="25.5"
            textAnchor="middle"
            fontSize="2.5"
            fill="var(--muted-foreground)"
          >
            올해 매출
          </text>
        </svg>

        {/* 범례 — 도넛 아래 전체 폭 행. 항목명(좌)↔금액(우, ml-auto)이 양 끝으로 최대 분리 */}
        <div className="flex w-full flex-col gap-3.5 text-[13px]">
          {slices.map((b) => {
            const color = CATEGORY_COLORS[b.category] ?? FALLBACK_COLOR;
            return (
              <div key={b.category} className="flex items-center gap-2.5">
                <span
                  className="h-2.5 w-2.5 flex-none rounded"
                  style={{ background: color }}
                />
                <span className="whitespace-nowrap text-foreground">{b.category}</span>
                <b className="ml-auto font-extrabold text-foreground">
                  {formatCompactWon(b.amount)}
                </b>
                <small className="ml-2 w-9 text-right text-[11px] text-muted-foreground">
                  {total > 0 ? Math.round((b.amount / total) * 100) : 0}%
                </small>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
