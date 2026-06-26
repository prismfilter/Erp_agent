'use client';

// 숫자 입력 통합 커스텀 컨트롤 — 테두리 하나 안에 [입력칸 + 우측 +/- 버튼].
// 값은 좌우 대칭 여백(pl/pr)으로 항상 가운데 정렬, 버튼은 오른쪽 안쪽에 절대배치 →
// 클릭해 수정해도 값이 밀리지 않고, 네이티브 위젯 없이 한 덩어리 커스텀 컨트롤로 보인다.
// 네이티브 +/- 스피너는 NO_SPINNER(arbitrary 유틸)로 제거.

import { forwardRef } from 'react';

// 네이티브 +/- 스피너 제거용 — Tailwind arbitrary 유틸(컴포넌트 스캔으로 생성되어 dev에서도 확실히 적용).
// 모든 숫자 입력칸 className에 포함. raw globals CSS는 dev HMR에서 누락될 수 있어 신뢰 불가.
export const NO_SPINNER =
  '[&::-webkit-inner-spin-button]:hidden [&::-webkit-outer-spin-button]:hidden [-moz-appearance:textfield]';

// 부동소수 노이즈 제거하며 step만큼 증감 (min/max clamp)
function nextValue(value: string | number, dir: 1 | -1, step: number, min?: number, max?: number): string {
  const current = Number(value);
  const base = Number.isFinite(current) ? current : 0;
  let v = Math.round((base + dir * step) * 1e6) / 1e6;
  if (min != null) v = Math.max(min, v);
  if (max != null) v = Math.min(max, v);
  return String(v);
}

// 보더리스 +/- 버튼(컨트롤 내부 우측 절대배치용). mousedown preventDefault로 입력 포커스 유지.
export function Stepper({ value, onChange, step = 1, min, max, disabled }: {
  value: string | number;
  onChange: (value: string) => void;
  step?: number;
  min?: number;
  max?: number;
  disabled?: boolean;
}) {
  const btn =
    'flex items-center justify-center px-0.5 text-muted-foreground hover:text-primary transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed';
  return (
    <span className="flex flex-col leading-[0]">
      <button type="button" tabIndex={-1} disabled={disabled} aria-label="증가"
        onMouseDown={(e) => e.preventDefault()} onClick={() => onChange(nextValue(value, 1, step, min, max))} className={btn}>
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <path d="m6 15 6-6 6 6" />
        </svg>
      </button>
      <button type="button" tabIndex={-1} disabled={disabled} aria-label="감소"
        onMouseDown={(e) => e.preventDefault()} onClick={() => onChange(nextValue(value, -1, step, min, max))} className={btn}>
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
    </span>
  );
}

interface NumberInputProps {
  value: string | number;
  onChange: (value: string) => void;
  step?: number;
  min?: number;
  max?: number;
  placeholder?: string;
  size?: 'sm' | 'md';      // sm: 표 셀, md(기본): 폼
  className?: string;      // 래퍼 폭/마진 등 (예: w-full / w-32 mx-auto)
  autoFocus?: boolean;
  disabled?: boolean;
  onBlur?: () => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

export const NumberInput = forwardRef<HTMLInputElement, NumberInputProps>(function NumberInput(
  { value, onChange, step = 1, min, max, placeholder, size = 'md', className = '', autoFocus, disabled, onBlur, onKeyDown },
  ref,
) {
  const sizeCls = size === 'sm' ? 'min-h-[2rem] py-1 text-xs' : 'min-h-[2.375rem] py-2 text-sm';
  return (
    <div className={`relative flex items-stretch rounded-lg border border-border bg-background focus-within:border-primary transition ${className}`}>
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
        className={`${NO_SPINNER} w-full bg-transparent border-0 outline-none text-center text-foreground tabular-nums pl-6 pr-6 ${sizeCls}`}
      />
      {/* +/- 버튼: 우측 안쪽 절대배치(값 가운데정렬 유지, 클릭 시 밀림 없음) */}
      <span className="absolute right-1.5 top-1/2 -translate-y-1/2">
        <Stepper value={value} onChange={onChange} step={step} min={min} max={max} disabled={disabled} />
      </span>
    </div>
  );
});
