'use client';

export default function RevenuePage() {
  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div>
        <h1 className="text-3xl font-bold text-[var(--color-foreground)] mb-2">
          매출현황
        </h1>
        <p className="text-[var(--color-muted-foreground)]">
          2026년 06월 09일 • 회사 전체 매출 현황
        </p>
      </div>

      {/* 준비 중 안내 */}
      <div className="bg-[var(--color-card)] border border-blue-500/50 rounded-lg p-8 text-center">
        <div className="text-4xl mb-4">📊</div>
        <h2 className="text-xl font-bold text-[var(--color-foreground)] mb-2">
          매출 데이터 연동 준비 중
        </h2>
        <p className="text-[var(--color-muted-foreground)]">
          분기별 정산 현황과 매출 통계 데이터가 곧 표시될 예정입니다.
        </p>
      </div>
    </div>
  );
}
