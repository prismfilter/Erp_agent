'use client';

// 용역 정산 상태 인라인 선택 — 미정산(기본) / 정산완료.
// 청구서 InvoiceStatusSelect와 동일한 Portal 드롭다운 패턴(테이블 overflow에 잘리지 않음).

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown } from 'lucide-react';

export type SettlementStatus = 'unsettled' | 'settled';

export const SETTLEMENT_STATUS_ORDER: SettlementStatus[] = ['unsettled', 'settled'];

export const SETTLEMENT_STATUS_LABEL: Record<SettlementStatus, string> = {
  unsettled: '미정산',
  settled: '정산완료',
};

export const SETTLEMENT_STATUS_STYLE: Record<SettlementStatus, string> = {
  unsettled: 'bg-amber-500/20 text-amber-400',
  settled: 'bg-green-500/20 text-green-400',
};

interface DropdownPos {
  left: number;
  top: number;
  width: number;
  openUp: boolean;
}

const DROPDOWN_WIDTH = 120;
const DROPDOWN_MAX_HEIGHT = 120;

interface SettlementStatusSelectProps {
  value: SettlementStatus;
  onChange: (status: SettlementStatus) => void;
  disabled?: boolean;
}

export function SettlementStatusSelect({ value, onChange, disabled }: SettlementStatusSelectProps) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<DropdownPos | null>(null);
  const [mounted, setMounted] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- 마운트 시 1회만 (재렌더 루프 없음)
  useEffect(() => setMounted(true), []);

  const computePosition = useCallback(() => {
    const btn = buttonRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUp = spaceBelow < DROPDOWN_MAX_HEIGHT && rect.top > spaceBelow;
    const left = Math.min(rect.left, window.innerWidth - DROPDOWN_WIDTH - 8);
    setPos({
      left: Math.max(8, left),
      top: openUp ? rect.top : rect.bottom,
      width: Math.max(rect.width, DROPDOWN_WIDTH),
      openUp,
    });
  }, []);

  const handleToggle = () => {
    if (disabled) return;
    if (!open) computePosition();
    setOpen((v) => !v);
  };

  const pick = (status: SettlementStatus) => {
    if (status !== value) onChange(status);
    setOpen(false);
  };

  // open 동안 스크롤/리사이즈 시 위치 재계산
  useEffect(() => {
    if (!open) return;
    const handler = () => computePosition();
    window.addEventListener('scroll', handler, true);
    window.addEventListener('resize', handler);
    return () => {
      window.removeEventListener('scroll', handler, true);
      window.removeEventListener('resize', handler);
    };
  }, [open, computePosition]);

  // 외부 클릭 / Escape → 닫기
  useEffect(() => {
    if (!open) return;
    const onMouse = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        buttonRef.current && !buttonRef.current.contains(target) &&
        dropdownRef.current && !dropdownRef.current.contains(target)
      ) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onMouse);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onMouse);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const dropdown = open && pos && (
    <div
      ref={dropdownRef}
      style={{
        position: 'fixed',
        left: pos.left,
        top: pos.openUp ? undefined : pos.top + 4,
        bottom: pos.openUp ? window.innerHeight - pos.top + 4 : undefined,
        width: pos.width,
      }}
      className="z-[300] p-1 bg-card border border-border rounded-lg shadow-xl"
    >
      {SETTLEMENT_STATUS_ORDER.map((status) => (
        <button
          key={status}
          type="button"
          onClick={() => pick(status)}
          className={`w-full px-2 py-1.5 mb-0.5 last:mb-0 rounded text-xs font-medium text-center transition cursor-pointer ${SETTLEMENT_STATUS_STYLE[status]} ${
            status === value ? 'ring-1 ring-inset ring-primary/60' : 'opacity-80 hover:opacity-100'
          }`}
        >
          {SETTLEMENT_STATUS_LABEL[status]}
        </button>
      ))}
    </div>
  );

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
        disabled={disabled}
        // 폭 고정 — 미정산/정산완료 글자 길이가 달라도 컬럼이 흔들리지 않게
        className={`inline-flex items-center justify-center gap-1 w-[5.5rem] px-2 py-1 rounded text-xs font-medium transition ${SETTLEMENT_STATUS_STYLE[value]} ${
          disabled ? 'opacity-50 cursor-default' : 'hover:opacity-90 cursor-pointer'
        }`}
        title="상태 변경"
      >
        {SETTLEMENT_STATUS_LABEL[value]}
        {!disabled && <ChevronDown className="h-3 w-3 opacity-70" />}
      </button>
      {mounted && dropdown ? createPortal(dropdown, document.body) : null}
    </>
  );
}
