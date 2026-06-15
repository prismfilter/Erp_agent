'use client';

// 용역 정산 생성 팝업 — 작가 선택 + 정산 기간(시작~종료) 선택 후 정산 실행.
// 작가 후보: 작가 마스터 ∪ 입금완료 청구서의 작업자명(자유 입력도 허용).

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { WriterSelect } from '@/components/invoice/WriterSelect';
import { DatePicker } from '@/components/ui/DatePicker';
import type { Writer, ServiceSettlement } from '@/types/invoice';

interface ServiceSettlementModalProps {
  writerOptions: Writer[];
  onClose: () => void;
  onCreated: (settlement: ServiceSettlement) => void;
}

export function ServiceSettlementModal({
  writerOptions,
  onClose,
  onCreated,
}: ServiceSettlementModalProps) {
  const [writerName, setWriterName] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!writerName.trim()) { setError('작가를 선택하거나 입력하세요.'); return; }
    if (!start || !end) { setError('정산 기간(시작일·종료일)을 선택하세요.'); return; }
    if (start > end) { setError('시작일이 종료일보다 늦습니다.'); return; }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/settlements/service', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          writer_name: writerName.trim(),
          period_start: start,
          period_end: end,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || '정산에 실패했습니다.');
        return;
      }
      onCreated(data.settlement as ServiceSettlement);
    } catch {
      setError('정산 요청 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const datePickerClass =
    'w-full flex items-center justify-between gap-2 px-3 py-2 text-sm bg-background border border-border rounded-lg hover:border-primary transition cursor-pointer text-foreground';

  const modal = (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      {/* 오버레이 */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={loading ? undefined : onClose}
      />

      {/* 카드 */}
      <div className="relative w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl p-6">
        {loading ? (
          // ── 정산 진행 중 로딩 ──
          <div className="py-10 flex flex-col items-center justify-center text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-[3px] border-border border-t-primary mb-4" />
            <p className="text-base font-semibold text-foreground animate-pulse">정산 진행 중...</p>
            <p className="text-xs text-muted-foreground mt-1">입금 완료 내역을 집계하고 있습니다.</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-foreground">용역 정산</h2>
              <button
                onClick={onClose}
                className="p-1 text-muted-foreground hover:text-foreground transition cursor-pointer rounded-md hover:bg-muted"
                aria-label="닫기"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              {/* 작가 선택 */}
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">작가명</label>
                <WriterSelect
                  writers={writerOptions}
                  value={writerName}
                  onChange={setWriterName}
                  onPickWriter={(w) => setWriterName(w.name)}
                  placeholder="작가 선택 / 입력"
                />
                <p className="text-[11px] text-muted-foreground mt-1">작가 마스터 · 내부 지급서 작업자 중 선택 (직접 입력 가능)</p>
              </div>

              {/* 정산 기간 */}
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">정산 기간 (입금 완료일 기준)</label>
                <div className="flex items-center gap-2">
                  <DatePicker value={start} onChange={setStart} className={datePickerClass} />
                  <span className="text-muted-foreground flex-shrink-0">~</span>
                  <DatePicker value={end} onChange={setEnd} className={datePickerClass} />
                </div>
              </div>

              {error && (
                <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 mt-6">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm border border-border rounded-lg text-foreground hover:bg-muted transition cursor-pointer"
              >
                취소
              </button>
              <button
                onClick={handleSubmit}
                className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition font-medium cursor-pointer"
              >
                정산 시작
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
