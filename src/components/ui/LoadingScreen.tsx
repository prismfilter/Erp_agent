'use client';

import { useEffect, useRef, useState } from 'react';

interface LoadingScreenProps {
  isDone?: boolean;
}

const SIZE = 152;
const STROKE = 14;
const RADIUS = (SIZE - STROKE) / 2;
const CENTER = SIZE / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function LoadingScreen({ isDone = false }: LoadingScreenProps) {
  const [progress, setProgress] = useState(0);
  const startRef = useRef(Date.now());
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (isDone) {
      cancelAnimationFrame(rafRef.current);
      setProgress(100);
      return;
    }
  }, [isDone]);

  useEffect(() => {
    startRef.current = Date.now();

    const tick = () => {
      const ms = Date.now() - startRef.current;
      let target: number;

      // Phase 1: 0 → 32% in 350ms (즉각적 피드백)
      if (ms < 350) {
        target = Math.floor((ms / 350) * 32);
      // Phase 2: 32 → 72% in 1.9s (자연스럽게 감속)
      } else if (ms < 2250) {
        target = Math.floor(32 + ((ms - 350) / 1900) * 40);
      // Phase 3: 72 → 89% 까지 천천히 (대기 상태)
      } else {
        target = Math.min(89, Math.floor(72 + ((ms - 2250) / 5000) * 17));
      }

      setProgress((prev) => (target > prev ? target : prev));
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  const dashOffset = CIRCUMFERENCE * (1 - progress / 100);

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-background gap-10">
      {/* 브랜드 */}
      <div className="flex flex-col items-center gap-3">
        <img
          src="/prism-filter-logo.svg"
          alt="PRISM FILTER"
          className="prism-logo w-12 h-12"
        />
        <div className="text-center">
          <p className="text-base font-bold text-foreground tracking-widest">PRISM FILTER</p>
          <p className="text-xs text-muted-foreground mt-0.5">정산 자동화 시스템</p>
        </div>
      </div>

      {/* 원형 로딩 */}
      <div className="relative flex items-center justify-center" style={{ width: SIZE, height: SIZE }}>

        {/* SVG 트랙 + 그라데이션 진행 호 */}
        <svg
          className="absolute inset-0"
          width={SIZE}
          height={SIZE}
          style={{ transform: 'rotate(-90deg)' }}
        >
          <defs>
            {/* 그라데이션: 다크 인디고 → 밝은 퍼리윙클 */}
            <linearGradient
              id="loadGrad"
              x1="0" y1="0"
              x2={SIZE} y2={SIZE}
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0%"   stopColor="#3a50e0" />
              <stop offset="45%"  stopColor="#5c6cff" />
              <stop offset="100%" stopColor="#9eb0ff" />
            </linearGradient>

            {/* 글로우 필터 */}
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* 배경 트랙 링 */}
          <circle
            cx={CENTER}
            cy={CENTER}
            r={RADIUS}
            fill="none"
            stroke="var(--border)"
            strokeWidth={STROKE}
            strokeOpacity={0.3}
          />

          {/* 진행 호 — 그라데이션 + 글로우 */}
          <circle
            cx={CENTER}
            cy={CENTER}
            r={RADIUS}
            fill="none"
            stroke="url(#loadGrad)"
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={dashOffset}
            filter="url(#glow)"
            style={{ transition: 'stroke-dashoffset 0.12s ease-out' }}
          />
        </svg>

        {/* 스피닝 글로우 오버레이 — 레퍼런스 이미지의 "돌아가는 빛" 효과 */}
        <div
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{
            animation: 'spin 2s linear infinite',
            background: `conic-gradient(
              from 0deg,
              transparent 0%,
              transparent 45%,
              rgba(94, 110, 255, 0.06) 65%,
              rgba(158, 176, 255, 0.22) 82%,
              rgba(158, 176, 255, 0.08) 92%,
              transparent 100%
            )`,
            WebkitMask: `radial-gradient(farthest-side, transparent calc(100% - ${STROKE + 6}px), white calc(100% - ${STROKE - 2}px))`,
            mask: `radial-gradient(farthest-side, transparent calc(100% - ${STROKE + 6}px), white calc(100% - ${STROKE - 2}px))`,
          }}
        />

        {/* 중앙 퍼센트 */}
        <div className="absolute inset-0 flex items-center justify-center select-none">
          <span
            className="font-bold text-foreground tabular-nums"
            style={{ fontSize: 26, letterSpacing: '-0.02em' }}
          >
            {progress}%
          </span>
        </div>
      </div>
    </div>
  );
}
