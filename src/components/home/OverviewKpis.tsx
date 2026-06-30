'use client';

// 홈 피드 현황 개요 KPI 3타일(히어로 우측 세로 스택).
// 타일1: 올해 청구건/입금완료/정산완료 퍼널. 타일2: 전속작가/일반작가/관리저작물. 타일3: 거래처.
// 라벨 위·숫자 아래, 단위 표기 없음. 카드 끝 보조 배지 제거.
import { CheckCircle2, Music, Building2 } from 'lucide-react';

interface OverviewKpisProps {
  billedCount: number;     // 올해 청구건(발행 전체)
  paidCount: number;       // 올해 입금완료
  settledCount: number;    // 올해 정산완료(상태)
  exclusiveCount: number;  // 전속작가 수
  generalCount: number;    // 일반작가 수
  worksCount: number;      // 관리 저작물 수
  clientsCount: number;    // 거래처 수
}

// 미니 수치 한 칸 — 라벨 위, 숫자 아래(단위 없음), 가운데 정렬
function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-center">
      <p className="text-[11px] font-medium text-muted-foreground whitespace-nowrap">{label}</p>
      <p className="mt-0.5 text-lg font-extrabold text-foreground tabular-nums">{value}</p>
    </div>
  );
}

// 다수치 타일(아이콘 + 미니 수치 N개)
function MultiTile({
  Icon,
  metrics,
}: {
  Icon: React.ElementType;
  metrics: { label: string; value: number }[];
}) {
  return (
    <div className="flex flex-1 items-center gap-3 rounded-xl border border-border bg-card px-4 py-2.5 shadow-sm">
      <div className="grid h-9 w-9 flex-none place-items-center rounded-lg bg-primary/10 text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <div className="grid flex-1 grid-cols-3 items-center gap-2">
        {metrics.map((m) => (
          <MiniStat key={m.label} label={m.label} value={m.value} />
        ))}
      </div>
    </div>
  );
}

export function OverviewKpis({
  billedCount,
  paidCount,
  settledCount,
  exclusiveCount,
  generalCount,
  worksCount,
  clientsCount,
}: OverviewKpisProps) {
  return (
    <div className="flex h-full flex-col gap-2.5">
      {/* 타일1 — 올해 청구건 → 입금완료 → 정산완료 퍼널 */}
      <MultiTile
        Icon={CheckCircle2}
        metrics={[
          { label: '올해 청구건', value: billedCount },
          { label: '입금완료', value: paidCount },
          { label: '정산완료', value: settledCount },
        ]}
      />

      {/* 타일2 — 전속작가 / 일반작가 / 관리저작물 */}
      <MultiTile
        Icon={Music}
        metrics={[
          { label: '전속작가', value: exclusiveCount },
          { label: '일반작가', value: generalCount },
          { label: '관리저작물', value: worksCount },
        ]}
      />

      {/* 타일3 — 거래처(단일) · 다른 타일과 동일한 3열 그리드로 첫 칸에 배치해 정렬 통일 */}
      <div className="flex flex-1 items-center gap-3 rounded-xl border border-border bg-card px-4 py-2.5 shadow-sm">
        <div className="grid h-9 w-9 flex-none place-items-center rounded-lg bg-primary/10 text-primary">
          <Building2 className="h-4 w-4" />
        </div>
        <div className="grid flex-1 grid-cols-3 items-center gap-2">
          <MiniStat label="거래처" value={clientsCount} />
          <span aria-hidden />
          <span aria-hidden />
        </div>
      </div>
    </div>
  );
}
