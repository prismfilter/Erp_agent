'use client';

// 홈 피드 현황 개요 KPI 3타일(히어로 우측 세로 스택).
// Props: settledCount·worksCount·writersCount·clientsCount·clientsDelta
import { CheckCircle2, Music, Building2 } from 'lucide-react';

interface OverviewKpisProps {
  settledCount: number;   // 올해 정산 완료 건수
  worksCount: number;     // 관리 저작물 수
  writersCount: number;   // 전속작가 수
  clientsCount: number;   // 거래처 수
  clientsDelta: number;   // 이번 분기 거래처 증감
}

// 타일 정의 — right는 optional(undefined이면 배지 미표시)
interface Tile {
  Icon: React.ElementType;
  label: string;
  value: string;
  right?: string;
  rightCls?: string;
}

export function OverviewKpis({
  settledCount,
  worksCount,
  writersCount,
  clientsCount,
  clientsDelta,
}: OverviewKpisProps) {
  // 거래처 증감 표시 문자열 및 색상 결정
  const deltaLabel = clientsDelta > 0 ? `+${clientsDelta}` : `${clientsDelta}`;
  const deltaCls = clientsDelta > 0 ? 'text-emerald-500' : 'text-muted-foreground';

  const tiles: Tile[] = [
    {
      Icon: CheckCircle2,
      label: '올해 정산 완료',
      value: `${settledCount}건`,
      // 퍼센트 배지 제거 — 건수만 표시
    },
    {
      Icon: Music,
      label: '관리 저작물',
      value: `${worksCount}곡`,
      right: `${writersCount}명`,
      rightCls: 'text-muted-foreground',
    },
    {
      Icon: Building2,
      label: '거래처',
      value: `${clientsCount}곳`,
      right: deltaLabel,
      rightCls: deltaCls,
    },
  ];

  return (
    <div className="flex h-full flex-col gap-3">
      {tiles.map(({ Icon, label, value, right, rightCls }) => (
        <div
          key={label}
          className="flex flex-1 items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 shadow-sm"
        >
          {/* 아이콘 배경 박스 */}
          <div className="grid h-9 w-9 flex-none place-items-center rounded-lg bg-primary/10 text-primary">
            <Icon className="h-4 w-4" />
          </div>

          {/* 라벨 + 수치 */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground">{label}</p>
            <p className="mt-0.5 text-lg font-extrabold text-foreground">{value}</p>
          </div>

          {/* 우측 보조 수치 — 있을 때만 렌더 */}
          {right !== undefined && (
            <span className={`ml-auto text-xs font-bold ${rightCls ?? ''}`}>{right}</span>
          )}
        </div>
      ))}
    </div>
  );
}
