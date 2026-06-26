'use client';

// 인라인 % 편집 셀 — 평소 "70 %"로 가운데 표시하고, 클릭하면 통합 숫자 컨트롤로 전환된다.
// 작가수수료율 등 0~100 비율 입력에 재사용. 값은 표시·편집 모두 가운데 정렬 → 클릭해도 안 밀림.

import { useState, useRef, useEffect } from 'react';
import { NumberInput } from '@/components/ui/NumberInput';

interface PercentCellProps {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}

export function PercentCell({ value, onChange, disabled }: PercentCellProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  const commit = () => {
    const n = Number(draft);
    const clamped = Number.isFinite(n) ? Math.min(100, Math.max(0, n)) : 0;
    onChange(clamped);
    setEditing(false);
  };

  if (disabled) {
    return <span className="block text-center text-muted-foreground/40 tabular-nums">—</span>;
  }

  if (editing) {
    return (
      <NumberInput
        ref={inputRef}
        size="sm"
        min={0}
        max={100}
        value={draft}
        onChange={(v) => setDraft(v)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit();
          if (e.key === 'Escape') { setDraft(String(value)); setEditing(false); }
        }}
        className="w-full"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => { setDraft(String(value)); setEditing(true); }}
      className="w-full min-h-[2rem] flex items-center justify-center text-center text-foreground tabular-nums border border-transparent rounded-lg hover:border-border hover:bg-muted/40 transition cursor-pointer"
      title="클릭하여 비율 수정"
    >
      {value} %
    </button>
  );
}
