'use client';

// 천 단위 콤마가 자동 표시되는 금액 입력 — type="number"는 콤마 표시가 불가하므로
// type="text" + inputMode="numeric"로 구현. 표시는 콤마, 값은 정수로 onChange 전달.

import type { InputHTMLAttributes } from 'react';
import { formatCurrency } from '@/lib/settlement/calculator';

interface NumericInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type' | 'inputMode'> {
  value: number;
  onChange: (value: number) => void;
  allowNegative?: boolean;
}

export function NumericInput({ value, onChange, allowNegative = false, ...rest }: NumericInputProps) {
  // 0 또는 빈 값은 빈칸으로 보여 placeholder가 노출되게 함
  const display = value ? formatCurrency(value) : '';

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const cleaned = e.target.value.replace(allowNegative ? /[^0-9-]/g : /[^0-9]/g, '');
    if (cleaned === '' || cleaned === '-') {
      onChange(0);
      return;
    }
    const n = Number(cleaned);
    onChange(Number.isFinite(n) ? n : 0);
  };

  return (
    <input
      {...rest}
      type="text"
      inputMode="numeric"
      value={display}
      onChange={handleChange}
    />
  );
}
