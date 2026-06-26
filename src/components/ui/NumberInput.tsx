'use client';

// 숫자 입력 — 네이티브 스피너 대신 입력칸 바로 옆(오른쪽)에 커스텀 +/- 버튼(Stepper)을 둔다.
// 가운데 정렬·좁은 칸에서 네이티브 스피너가 숫자를 가리는 문제를 해결.
// 네이티브 스피너 자체는 globals.css에서 전역 제거(.hide-number-spin)됨.

import { forwardRef } from 'react';

// 부동소수 노이즈 제거하며 step만큼 증감 (min/max clamp)
function nextValue(value: string | number, dir: 1 | -1, step: number, min?: number, max?: number): string {
  const current = Number(value);
  const base = Number.isFinite(current) ? current : 0;
  let v = Math.round((base + dir * step) * 1e6) / 1e6;
  if (min != null) v = Math.max(min, v);
  if (max != null) v = Math.min(max, v);
  return String(v);
}

// +/- 버튼 컬럼 — 입력칸 오른쪽에 고정 배치(항상 같은 폭). 클릭/수정 모드 모두에서 재사용.
export function Stepper({ value, onChange, step = 1, min, max, disabled }: {
  value: string | number;
  onChange: (value: string) => void;
  step?: number;
  min?: number;
  max?: number;
  disabled?: boolean;
}) {
  // mousedown preventDefault: 입력 포커스/blur 유지(클릭편집 모드에서 편집이 풀리지 않게)
  const btn =
    'flex-1 flex items-center justify-center px-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed';
  return (
    <div className="flex flex-col shrink-0 rounded-lg border border-border overflow-hidden">
      <button type="button" tabIndex={-1} disabled={disabled} aria-label="증가"
        onMouseDown={(e) => e.preventDefault()} onClick={() => onChange(nextValue(value, 1, step, min, max))} className={btn}>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <path d="m18 15-6-6-6 6" />
        </svg>
      </button>
      <button type="button" tabIndex={-1} disabled={disabled} aria-label="감소"
        onMouseDown={(e) => e.preventDefault()} onClick={() => onChange(nextValue(value, -1, step, min, max))} className={`${btn} border-t border-border`}>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
    </div>
  );
}

interface NumberInputProps {
  value: string | number;
  onChange: (value: string) => void;
  step?: number;
  min?: number;
  max?: number;
  placeholder?: string;
  className?: string;        // 입력 element 클래스
  wrapperClassName?: string; // 바깥 래퍼 클래스(폭 지정: 예 w-full / w-32)
  autoFocus?: boolean;
  disabled?: boolean;
  onBlur?: () => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

export const NumberInput = forwardRef<HTMLInputElement, NumberInputProps>(function NumberInput(
  { value, onChange, step = 1, min, max, placeholder, className = '', wrapperClassName = '', autoFocus, disabled, onBlur, onKeyDown },
  ref,
) {
  return (
    <div className={`flex items-stretch gap-1 ${wrapperClassName}`}>
      <input
        ref={ref}
        type="number"
        inputMode="decimal"
        value={value}
        placeholder={placeholder}
        min={min}
        max={max}
        step={step}
        autoFocus={autoFocus}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        onKeyDown={onKeyDown}
        className={`hide-number-spin min-w-0 flex-1 ${className}`}
      />
      <Stepper value={value} onChange={onChange} step={step} min={min} max={max} disabled={disabled} />
    </div>
  );
});
