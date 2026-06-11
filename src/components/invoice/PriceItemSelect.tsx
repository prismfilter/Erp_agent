'use client';

// 프라이스 테이블 항목 검색 셀렉트 — 카테고리 그룹핑 + 한글 검색

import { useState, useRef, useEffect, useMemo } from 'react';
import type { PriceItem } from '@/types/invoice';
import { formatCurrency } from '@/lib/settlement/calculator';

interface PriceItemSelectProps {
  priceItems: PriceItem[];
  selectedId: string | null;
  onSelect: (item: PriceItem | null) => void;
  placeholder?: string;
}

export function PriceItemSelect({ priceItems, selectedId, onSelect, placeholder = '항목 선택' }: PriceItemSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = useMemo(
    () => priceItems.find((p) => p.id === selectedId) ?? null,
    [priceItems, selectedId]
  );

  // 외부 클릭 시 닫기
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

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

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
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

      {open && (
        <div className="absolute z-50 mt-1 w-80 max-h-80 overflow-y-auto bg-card border border-border rounded-lg shadow-xl">
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
            onClick={() => { onSelect(null); setOpen(false); setSearch(''); }}
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
                    onClick={() => { onSelect(item); setOpen(false); setSearch(''); }}
                    className={`w-full px-3 py-2 text-xs text-left hover:bg-primary/10 transition flex justify-between gap-2 ${
                      item.id === selectedId ? 'bg-primary/15 text-primary' : 'text-foreground'
                    }`}
                  >
                    <span className="truncate">{item.name}</span>
                    <span className="text-muted-foreground flex-shrink-0 tabular-nums">
                      {item.is_formula
                        ? '수식'
                        : item.billing_price != null
                        ? formatCurrency(item.billing_price)
                        : '-'}
                    </span>
                  </button>
                ))}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
