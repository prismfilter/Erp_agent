'use client';

// 현대적 날짜 선택기 — react-day-picker(v10) 캘린더를 포털 팝오버로 띄운다.
// value/onChange는 'YYYY-MM-DD' 문자열(타임존 안전). 표시는 '2026. 06. 12.'.

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { DayPicker } from 'react-day-picker';
import { ko } from 'react-day-picker/locale';
import 'react-day-picker/style.css';

interface DatePickerProps {
  value: string; // YYYY-MM-DD
  onChange: (value: string) => void;
  className?: string;
}

function parseYMD(s: string): Date | undefined {
  if (!s) return undefined;
  const [y, m, d] = s.split('-').map(Number);
  if (!y || !m || !d) return undefined;
  return new Date(y, m - 1, d); // 로컬 자정 — 타임존 이동 없음
}

function formatYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function displayLabel(s: string): string {
  const d = parseYMD(s);
  if (!d) return '날짜 선택';
  return `${d.getFullYear()}. ${String(d.getMonth() + 1).padStart(2, '0')}. ${String(d.getDate()).padStart(2, '0')}.`;
}

export function DatePicker({ value, onChange, className }: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  const [mounted, setMounted] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- 마운트 시 1회만 실행 (SSR 포털 가드)
  useEffect(() => setMounted(true), []);

  const computePos = useCallback(() => {
    const b = btnRef.current;
    if (!b) return;
    const r = b.getBoundingClientRect();
    // 화면 우측/하단 밖으로 넘치지 않도록 보정
    const left = Math.min(r.left, window.innerWidth - 320);
    setPos({ left: Math.max(8, left), top: r.bottom + 4 });
  }, []);

  const toggle = () => {
    if (!open) computePos();
    setOpen((v) => !v);
  };

  useEffect(() => {
    if (!open) return;
    const onScroll = () => computePos();
    const onClick = (e: MouseEvent) => {
      const t = e.target as Node;
      if (
        btnRef.current && !btnRef.current.contains(t) &&
        popRef.current && !popRef.current.contains(t)
      ) {
        setOpen(false);
      }
    };
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onScroll);
    document.addEventListener('mousedown', onClick);
    return () => {
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onScroll);
      document.removeEventListener('mousedown', onClick);
    };
  }, [open, computePos]);

  const selected = parseYMD(value);

  const popover = open && pos && (
    <div
      ref={popRef}
      style={{ position: 'fixed', left: pos.left, top: pos.top, zIndex: 100 }}
      className="rdp-popover bg-card border border-border rounded-xl shadow-2xl p-3"
    >
      <DayPicker
        mode="single"
        required
        selected={selected}
        onSelect={(d) => {
          if (d) {
            onChange(formatYMD(d));
            setOpen(false);
          }
        }}
        locale={ko}
        showOutsideDays
        defaultMonth={selected}
        captionLayout="dropdown"
        startMonth={new Date(2020, 0)}
        endMonth={new Date(2035, 11)}
        reverseYears
      />
    </div>
  );

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={toggle}
        className={className}
      >
        <span className="tabular-nums">{displayLabel(value)}</span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="15" height="15" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          className="text-muted-foreground flex-shrink-0"
        >
          <rect width="18" height="18" x="3" y="4" rx="2" />
          <path d="M3 10h18M8 2v4M16 2v4" />
        </svg>
      </button>
      {mounted && popover ? createPortal(popover, document.body) : null}
    </>
  );
}
