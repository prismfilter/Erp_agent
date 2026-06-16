'use client';

// 인라인 % 편집 셀 — 평소 "70 %"로 표시하고, 클릭하면 입력창으로 전환된다.
// 작가수수료율 등 0~100 비율 입력에 재사용.

import { useState, useRef, useEffect } from 'react';

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
      <input
        ref={inputRef}
        type="number"
        min={0}
        max={100}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit();
          if (e.key === 'Escape') {
            setDraft(String(value));
            setEditing(false);
          }
        }}
        className="w-full px-2 py-1.5 text-center bg-background border border-primary rounded outline-none text-foreground tabular-nums"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        setDraft(String(value));
        setEditing(true);
      }}
      className="w-full px-2 py-1.5 text-center bg-background border border-border rounded hover:border-primary/50 transition text-foreground tabular-nums"
      title="클릭하여 비율 수정"
    >
      {value} %
    </button>
  );
}
