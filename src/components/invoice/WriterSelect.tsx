'use client';

// 작업자 콤보박스 — 자유 입력 + 등록 작가(작가 마스터) 자동완성 선택
// 등록 작가를 고르면 부모가 이름 + 수수료 요율을 함께 설정한다.
// 드롭다운은 React Portal로 body에 렌더 → 테이블 overflow 컨테이너에 잘리지 않음.

import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import type { Writer } from '@/types/invoice';

interface WriterSelectProps {
  writers: Writer[];
  value: string;                      // 현재 writer_names
  onChange: (name: string) => void;   // 자유 입력 커밋
  onPickWriter: (w: Writer) => void;  // 등록 작가 선택 (이름 + 요율)
  placeholder?: string;
}

interface DropdownPos {
  left: number;
  top: number;
  width: number;
  openUp: boolean; // 아래 공간 부족 시 위로 펼침
}

const DROPDOWN_WIDTH = 240;
const DROPDOWN_MAX_HEIGHT = 288; // max-h-72

export function WriterSelect({
  writers,
  value,
  onChange,
  onPickWriter,
  placeholder = '작업자명',
}: WriterSelectProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  const [pos, setPos] = useState<DropdownPos | null>(null);
  const [mounted, setMounted] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 포털은 클라이언트에서만 (SSR 안전) — 1회 마운트 가드
  // eslint-disable-next-line react-hooks/set-state-in-effect -- 마운트 시 1회만 실행 (재렌더 루프 없음)
  useEffect(() => setMounted(true), []);

  // 트리거 버튼 기준 드롭다운 좌표 계산
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
    if (!open) {
      setDraft(value);
      computePosition();
    }
    setOpen((v) => !v);
  };

  // 자유 입력 커밋 후 닫기
  const commit = useCallback(() => {
    onChange(draft.trim());
    setOpen(false);
  }, [draft, onChange]);

  // 커밋 없이 닫기 (Escape)
  const cancel = useCallback(() => setOpen(false), []);

  // 등록 작가 선택 → 부모가 이름 + 요율 설정
  const pick = (w: Writer) => {
    onPickWriter(w);
    setOpen(false);
  };

  // open 동안: 스크롤/리사이즈 시 위치 재계산
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

  // 외부 클릭 → 입력값 커밋 후 닫기
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        buttonRef.current && !buttonRef.current.contains(target) &&
        dropdownRef.current && !dropdownRef.current.contains(target)
      ) {
        commit();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open, commit]);

  // 열릴 때 입력창 포커스
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // 이름 검색 필터
  const matches = useMemo(() => {
    const q = draft.trim().toLowerCase();
    if (!q) return writers;
    return writers.filter((w) => w.name.toLowerCase().includes(q));
  }, [writers, draft]);

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
      className="z-[300] max-h-72 overflow-y-auto bg-card border border-border rounded-lg shadow-xl"
    >
      {/* 자유 입력 겸 검색 */}
      <div className="sticky top-0 bg-card p-2 border-b border-border">
        <input
          ref={inputRef}
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit();
            if (e.key === 'Escape') cancel();
          }}
          placeholder="작업자명 입력 / 검색"
          className="w-full px-2 py-1.5 text-xs bg-background border border-border rounded outline-none focus:border-primary text-foreground"
        />
      </div>

      {writers.length === 0 ? (
        <div className="px-3 py-3 text-[11px] text-muted-foreground text-center">
          등록된 작가가 없습니다 · 이름을 직접 입력하세요
        </div>
      ) : matches.length === 0 ? (
        <div className="px-3 py-3 text-[11px] text-muted-foreground text-center">
          일치하는 작가 없음 · 입력값을 그대로 사용
        </div>
      ) : (
        matches.map((w) => (
          <button
            key={w.id}
            type="button"
            onClick={() => pick(w)}
            className="w-full px-3 py-2 text-xs text-left hover:bg-primary/10 transition flex items-center justify-between gap-2 text-foreground cursor-pointer"
          >
            <span className="truncate">{w.name}</span>
            <span className="flex-shrink-0 text-[10px] text-muted-foreground tabular-nums">
              {w.writer_type === '전속작가' ? '전속' : '일반'} · {w.fee_rate}%
            </span>
          </button>
        ))
      )}
    </div>
  );

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
        className="w-full px-2 py-1.5 text-center bg-background border border-border rounded hover:border-primary/50 transition truncate text-foreground cursor-pointer"
        title={value || undefined}
      >
        {value ? value : <span className="text-muted-foreground">{placeholder}</span>}
      </button>

      {mounted && dropdown ? createPortal(dropdown, document.body) : null}
    </>
  );
}
