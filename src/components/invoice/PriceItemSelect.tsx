'use client';

// 프라이스 테이블 항목 검색 셀렉트 — 카테고리 그룹핑 + 한글 검색
// 드롭다운은 React Portal로 body에 렌더 → 테이블 overflow 컨테이너에 잘리지 않음

import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import type { PriceItem } from '@/types/invoice';
import { formatWon } from '@/lib/settlement/calculator';

interface PriceItemSelectProps {
  priceItems: PriceItem[];
  selectedId: string | null;
  onSelect: (item: PriceItem | null) => void;
  placeholder?: string;
}

// 드롭다운 위치 (fixed 좌표)
interface DropdownPos {
  left: number;
  top: number;
  width: number;
  openUp: boolean; // 아래 공간 부족 시 위로 펼침
}

const DROPDOWN_WIDTH = 320; // w-80
const DROPDOWN_MAX_HEIGHT = 320; // max-h-80

export function PriceItemSelect({ priceItems, selectedId, onSelect, placeholder = '항목 선택' }: PriceItemSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [pos, setPos] = useState<DropdownPos | null>(null);
  const [mounted, setMounted] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 포털은 클라이언트에서만 (SSR 안전) — 1회 마운트 가드
  // eslint-disable-next-line react-hooks/set-state-in-effect -- 마운트 시 1회만 실행 (재렌더 루프 없음)
  useEffect(() => setMounted(true), []);

  const selected = useMemo(
    () => priceItems.find((p) => p.id === selectedId) ?? null,
    [priceItems, selectedId]
  );

  // 트리거 버튼 기준 드롭다운 좌표 계산
  const computePosition = useCallback(() => {
    const btn = buttonRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUp = spaceBelow < DROPDOWN_MAX_HEIGHT && rect.top > spaceBelow;
    // 화면 우측 밖으로 넘치지 않도록 left 보정
    const left = Math.min(rect.left, window.innerWidth - DROPDOWN_WIDTH - 8);
    setPos({
      left: Math.max(8, left),
      top: openUp ? rect.top : rect.bottom,
      width: Math.max(rect.width, DROPDOWN_WIDTH),
      openUp,
    });
  }, []);

  // 열 때 위치 계산
  const handleToggle = () => {
    if (!open) computePosition();
    setOpen((v) => !v);
  };

  const close = useCallback(() => {
    setOpen(false);
    setSearch('');
  }, []);

  // open 동안: 스크롤/리사이즈 시 위치 재계산
  useEffect(() => {
    if (!open) return;
    const handler = () => computePosition();
    // capture: true — 내부 스크롤 컨테이너 스크롤도 포착
    window.addEventListener('scroll', handler, true);
    window.addEventListener('resize', handler);
    return () => {
      window.removeEventListener('scroll', handler, true);
      window.removeEventListener('resize', handler);
    };
  }, [open, computePosition]);

  // 외부 클릭 시 닫기 — 버튼·드롭다운(포털) 둘 다 검사
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        buttonRef.current && !buttonRef.current.contains(target) &&
        dropdownRef.current && !dropdownRef.current.contains(target)
      ) {
        close();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open, close]);

  // 열릴 때 검색창 포커스
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // 검색 필터 + 카테고리 그룹핑
  const grouped = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = q
      ? priceItems.filter(
          (p) => p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q)
        )
      : priceItems;

    const groups = new Map<string, PriceItem[]>();
    filtered.forEach((p) => {
      if (!groups.has(p.category)) groups.set(p.category, []);
      groups.get(p.category)!.push(p);
    });
    return Array.from(groups.entries());
  }, [priceItems, search]);

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
      className="z-[100] max-h-80 overflow-y-auto bg-card border border-border rounded-lg shadow-xl"
    >
      {/* 검색 입력 */}
      <div className="sticky top-0 bg-card p-2 border-b border-border">
        <input
          ref={inputRef}
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="작업내역 검색..."
          className="w-full px-2 py-1.5 text-xs bg-background border border-border rounded outline-none focus:border-primary text-foreground"
        />
      </div>

      {/* 커스텀(직접 입력) 옵션 */}
      <button
        type="button"
        onClick={() => { onSelect(null); close(); }}
        className="w-full px-3 py-2 text-xs text-left hover:bg-primary/10 text-muted-foreground italic"
      >
        ✏️ 직접 입력 (커스텀 항목)
      </button>

      {grouped.length === 0 ? (
        <div className="px-3 py-4 text-xs text-muted-foreground text-center">
          검색 결과가 없습니다.
        </div>
      ) : (
        grouped.map(([category, items]) => (
          <div key={category}>
            <div className="px-3 py-1.5 text-[10px] font-semibold text-muted-foreground bg-muted/50 uppercase sticky top-[41px]">
              {category}
            </div>
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => { onSelect(item); close(); }}
                className={`w-full px-3 py-2 text-xs text-left hover:bg-primary/10 transition flex justify-between gap-2 ${
                  item.id === selectedId ? 'bg-primary/15 text-primary' : 'text-foreground'
                }`}
              >
                <span className="truncate">{item.name}</span>
                <span className="text-muted-foreground flex-shrink-0 tabular-nums">
                  {item.is_formula
                    ? '수식'
                    : item.billing_price != null
                    ? formatWon(item.billing_price)
                    : '-'}
                </span>
              </button>
            ))}
          </div>
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
        className="w-full px-2 py-1.5 text-xs text-left bg-background border border-border rounded hover:border-primary/50 transition truncate text-foreground"
        title={selected ? `${selected.category} / ${selected.name}` : undefined}
      >
        {selected ? (
          <span>
            <span className="text-muted-foreground">[{selected.category}]</span> {selected.name}
          </span>
        ) : (
          <span className="text-muted-foreground">{placeholder}</span>
        )}
      </button>

      {mounted && dropdown ? createPortal(dropdown, document.body) : null}
    </>
  );
}
