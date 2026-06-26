'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { WorkWriterGroup } from '@/types/invoice';

// 접힘 상태 기본 노출 작가 수
const COLLAPSED = 5;
// 펼침 시 초기 노출 작가 수
const EXPAND = 10;
// 더보기 클릭 시 추가 노출 단위
const STEP = 5;

interface WriterSidePanelProps {
  writers: WorkWriterGroup[];
  total: number;        // 전체 작품수 (전체보기 카운트)
  selected: string | null; // null = 전체보기
  onSelect: (key: string | null) => void;
}

export function WriterSidePanel({ writers, total, selected, onSelect }: WriterSidePanelProps) {
  // 펼침 여부 상태
  const [expanded, setExpanded] = useState(false);
  // 현재 노출할 작가 수 상태
  const [visible, setVisible] = useState(COLLAPSED);

  // 펼침 상태면 visible 만큼, 접힘 상태면 COLLAPSED 만큼 슬라이스
  const shown = expanded ? writers.slice(0, visible) : writers.slice(0, COLLAPSED);

  // 작가·전체보기 버튼 렌더 헬퍼
  const renderWriterButton = (label: string, count: number, key: string | null) => {
    const active = selected === key;
    return (
      <button
        key={key ?? '__all__'}
        onClick={() => onSelect(key)}
        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition cursor-pointer ${
          active
            ? 'bg-primary text-primary-foreground font-semibold shadow-sm'
            : 'text-foreground hover:bg-primary/10'
        }`}
      >
        <span className="truncate">{label}</span>
        <span
          className={`ml-2 text-xs tabular-nums ${
            active ? 'text-primary-foreground/80' : 'text-muted-foreground'
          }`}
        >
          {count}
        </span>
      </button>
    );
  };

  return (
    <aside className="sticky top-6 self-start bg-card border border-border rounded-lg p-2 max-h-[calc(100vh-7rem)] overflow-y-auto gradient-scroll transition-all duration-300">
      {/* 헤더 */}
      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        작가
      </div>

      {/* 버튼 리스트: 전체보기 + 작가 목록 */}
      <div className="space-y-1">
        {renderWriterButton('전체보기', total, null)}
        {shown.map((w) => renderWriterButton(w.writer_name, w.count, w.writer_name))}
      </div>

      {/* 하단 컨트롤: 작가 수가 COLLAPSED 이하면 숨김 */}
      {writers.length > COLLAPSED && (
        <div className="mt-1">
          {/* 접힘 상태 → 펼치기 버튼 */}
          {!expanded && (
            <button
              onClick={() => {
                setExpanded(true);
                setVisible(EXPAND);
              }}
              className="w-full flex items-center justify-center gap-1 px-3 py-0.5 text-xs text-muted-foreground hover:text-foreground hover:bg-primary/5 rounded-lg transition cursor-pointer"
            >
              <ChevronDown className="w-3.5 h-3.5" />
              펼치기
            </button>
          )}

          {/* 펼침 상태 → 더보기 + 구분선 + 접기 */}
          {expanded && (
            <>
              {/* 더 노출할 작가가 남아있을 때 더보기 버튼 표시 */}
              {visible < writers.length && (
                <button
                  onClick={() => setVisible((v) => Math.min(v + STEP, writers.length))}
                  className="w-full flex items-center justify-center gap-1 px-3 py-0.5 text-xs text-muted-foreground hover:text-foreground hover:bg-primary/5 rounded-lg transition cursor-pointer"
                >
                  더보기
                </button>
              )}

              {/* 구분선 */}
              <div className="my-1 border-t border-border" />

              {/* 접기 버튼 */}
              <button
                onClick={() => {
                  setExpanded(false);
                  setVisible(COLLAPSED);
                }}
                className="w-full flex items-center justify-center gap-1 px-3 py-0.5 text-xs text-muted-foreground hover:text-foreground hover:bg-primary/5 rounded-lg transition cursor-pointer"
              >
                <ChevronUp className="w-3.5 h-3.5" />
                접기
              </button>
            </>
          )}
        </div>
      )}
    </aside>
  );
}
