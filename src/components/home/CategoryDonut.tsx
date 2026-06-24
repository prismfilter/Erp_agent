'use client';

// 홈 피드 카테고리 도넛 — 저작권료/용역/기타 구성.
// ⚠️ 용역은 용역정산(작가지급액) 합계, 저작권료/기타는 청구서 귀속금액(성격 상이).
// 중앙 라벨은 '매출 구성'(세 값 합)으로, 히어로 '누적 수입'과 구분.
import { formatCompactWon } from '@/lib/home/format';

interface CategoryDonutProps {
  buckets: { bucket: '저작권료' | '용역' | '기타'; amount: number }[];
}

// 카테고리별 색상 — 저작권료는 테마 연동, 용역/기타는 카테고리 식별 고정색
const COLORS: Record<string, string> = {
  저작권료: 'var(--primary)',
  용역: '#34d399',
  기타: '#fbbf24',
};

// 둘레 100 정규화 반지름 (2πr = 100 → r ≈ 15.915)
const R = 15.915;
const CIRC = 100;

export function CategoryDonut({ buckets }: CategoryDonutProps) {
  const total = buckets.reduce((s, b) => s + b.amount, 0);

  // 세그먼트 offset 누적: 12시 방향 시작(offset=25)
  let offset = 25;

  return (
    <section className="rounded-xl border border-border bg-card shadow-sm">
      {/* 카드 헤더 */}
      <div className="px-5 pt-4">
        <h3 className="text-sm font-extrabold text-foreground">카테고리별 매출</h3>
        <p className="mt-0.5 text-[11.5px] text-muted-foreground">저작권료 · 용역 · 기타</p>
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
            buckets.map((b) => {
              const pct = (b.amount / total) * CIRC;
              const dash = `${pct} ${CIRC - pct}`;
              // offset은 현재 시작 위치, 렌더 후 다음 세그먼트 위해 감소
              const seg = (
                <circle
                  key={b.bucket}
                  cx="21"
                  cy="21"
                  r={R}
                  fill="none"
                  stroke={COLORS[b.bucket]}
                  strokeWidth="6"
                  strokeDasharray={dash}
                  strokeDashoffset={offset}
                />
              );
              offset -= pct;
              return seg;
            })}

          {/* 중앙 합계 — '매출 구성'(히어로 누적 수입과 별개) */}
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
            매출 구성
          </text>
        </svg>

        {/* 범례 — 버킷별 색·이름·금액·퍼센트 */}
        <div className="flex flex-col gap-3 text-[12.5px]">
          {buckets.map((b) => (
            <div key={b.bucket} className="flex min-w-[150px] items-center gap-2">
              <span
                className="h-2.5 w-2.5 rounded"
                style={{ background: COLORS[b.bucket] }}
              />
              <span className="text-foreground">{b.bucket}</span>
              <b className="ml-auto font-extrabold text-foreground">
                {formatCompactWon(b.amount)}
              </b>
              <small className="ml-1.5 text-[11px] text-muted-foreground">
                {total > 0 ? Math.round((b.amount / total) * 100) : 0}%
              </small>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
