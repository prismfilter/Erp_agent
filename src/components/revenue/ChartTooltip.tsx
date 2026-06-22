'use client';

// 매출 차트 공용 커스텀 툴팁 — 막대에 호버하면 그라데이션 색감의 블럭으로 정보 표시.
// 브라우저 기본 title 박스를 대체. 포털로 body에 fixed 렌더(차트 overflow에 잘리지 않음).

import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

export interface TooltipContent {
  title: string;                              // 예: "2026년 6월"
  value: string;                              // 예: "1,234,000 원"
  sub?: string;                               // 예: "3건"
  compare?: { label: string; value: string }; // 전년 비교 라인(선택)
}

interface TooltipState extends TooltipContent {
  x: number;
  y: number;
}

export function useChartTooltip() {
  const [state, setState] = useState<TooltipState | null>(null);

  const show = useCallback((e: React.MouseEvent, content: TooltipContent) => {
    setState({ ...content, x: e.clientX, y: e.clientY });
  }, []);

  const move = useCallback((e: React.MouseEvent) => {
    const { clientX, clientY } = e;
    setState((s) => (s ? { ...s, x: clientX, y: clientY } : s));
  }, []);

  const hide = useCallback(() => setState(null), []);

  return { state, show, move, hide };
}

const TOOLTIP_W = 200; // 위치 클램프용 추정 폭

export function ChartTooltip({ state }: { state: TooltipState | null }) {
  const [mounted, setMounted] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- 마운트 시 1회(SSR 포털 가드)
  useEffect(() => setMounted(true), []);

  if (!mounted || !state) return null;

  // 커서 우하단에 띄우되 화면 밖으로 넘치지 않게 클램프
  const left = Math.max(8, Math.min(state.x + 14, window.innerWidth - TOOLTIP_W));
  const top = Math.max(8, Math.min(state.y + 14, window.innerHeight - 110));

  return createPortal(
    <div
      style={{
        position: 'fixed',
        left,
        top,
        pointerEvents: 'none',
        background: 'linear-gradient(135deg, var(--chart-tip-from, #4a5ee8) 0%, var(--chart-tip-to, #7c8cff) 100%)',
      }}
      className="z-[400] rounded-lg px-3 py-2 shadow-xl text-white min-w-[120px]"
    >
      <p className="text-[11px] font-semibold text-white/85 whitespace-nowrap">{state.title}</p>
      <p className="text-sm font-bold tabular-nums whitespace-nowrap">{state.value}</p>
      {state.sub && <p className="text-[10px] text-white/80">{state.sub}</p>}
      {state.compare && (
        <div className="mt-1.5 pt-1.5 border-t border-white/25">
          <p className="text-[10px] text-amber-200 whitespace-nowrap">{state.compare.label}</p>
          <p className="text-xs font-semibold tabular-nums whitespace-nowrap">{state.compare.value}</p>
        </div>
      )}
    </div>,
    document.body
  );
}
