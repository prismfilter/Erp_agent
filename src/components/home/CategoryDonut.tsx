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

// 둘레 100 정규화 반지름 (2πr = 100 → r ≈ 15.915)
const R = 15.915;
const CIRC = 100;

export function CategoryDonut({ slices }: CategoryDonutProps) {
  const total = slices.reduce((s, b) => s + b.amount, 0);

  // 세그먼트 offset 누적: 12시 방향 시작(offset=25)
  let offset = 25;

  return (
    <section className="rounded-xl border border-border bg-card shadow-sm">
      {/* 카드 헤더 */}
      <div className="px-5 pt-4">
        <h3 className="text-sm font-extrabold text-foreground">카테고리별 매출</h3>
        <p className="mt-0.5 text-[11.5px] text-muted-foreground">올해 매출 구성</p>
      </div>

      {/* 도넛 + 범례 */}
      <div className="flex items-center gap-5 px-5 pb-6 pt-4">
        {/* SVG 도넛 — stroke-dasharray 방식, 반지름 R로 둘레 100 정규화 */}
        <svg width="120" height="120" viewBox="0 0 42 42" className="flex-none">
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
            slices.map((b) => {
              const pct = (b.amount / total) * CIRC;
              const dash = `${pct} ${CIRC - pct}`;
              const color = CATEGORY_COLORS[b.category] ?? FALLBACK_COLOR;
              // offset은 현재 시작 위치, 렌더 후 다음 세그먼트 위해 감소
              const seg = (
                <circle
                  key={b.category}
                  cx="21"
                  cy="21"
                  r={R}
                  fill="none"
                  stroke={color}
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

        {/* 범례 — 카테고리별 색·이름·금액·퍼센트 */}
        <div className="flex flex-col gap-3 text-[12.5px]">
          {slices.map((b) => {
            const color = CATEGORY_COLORS[b.category] ?? FALLBACK_COLOR;
            return (
              <div key={b.category} className="flex min-w-[150px] items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded"
                  style={{ background: color }}
                />
                <span className="text-foreground">{b.category}</span>
                <b className="ml-auto font-extrabold text-foreground">
                  {formatCompactWon(b.amount)}
                </b>
                <small className="ml-1.5 text-[11px] text-muted-foreground">
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
