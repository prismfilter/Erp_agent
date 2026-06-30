'use client';

// 용역 정산 상세 모달 — 한 거래(청구서)에서 한 작가가 어떤 항목으로 얼마를 벌었는지 표시.
// 목록의 작가 셀 클릭 시 진입. WorkDetailModal과 동일한 오버레이/닫기 패턴.

import { useEffect } from 'react';
import { FileText } from 'lucide-react';
import { formatWon } from '@/lib/settlement/calculator';
import { parseWorkContent } from '@/lib/invoice/calculator';
import type { SettlementRow } from '@/lib/settlement/serviceRows';

interface SettlementDetailModalProps {
  row: SettlementRow;
  onClose: () => void;
  onGenerate?: () => void; // 정산서 생성 — 이 행 내용으로 용역정산서 미리보기
}

// 상단 요약 필드 한 칸
function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <p className="text-[11px] text-muted-foreground mb-0.5">{label}</p>
      <p className="text-sm font-semibold text-foreground break-keep">{value || '-'}</p>
    </div>
  );
}

export function SettlementDetailModal({ row, onClose, onGenerate }: SettlementDetailModalProps) {
  // Esc로 닫기
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="bg-card border border-border rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 — 제목 가운데, 닫기 우측 고정 */}
        <div className="relative flex items-center justify-center px-5 py-4 border-b border-border">
          <h2 className="text-lg font-bold text-foreground">정산 상세</h2>
          <button
            onClick={onClose}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition cursor-pointer"
            aria-label="닫기"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 본문 (스크롤) — 내용 높이에 맞춰 모달이 자연스럽게 늘어남(과한 빈공간 방지) */}
        <div className="flex-1 min-h-0 overflow-y-auto gradient-scroll px-6 py-5 space-y-5">
          {/* 요약 — 작가 · 거래처 · 거래명을 여유있는 정보 블럭으로(작업내용 앞에 업체명 노출) */}
          <div className="grid grid-cols-3 gap-4 bg-muted/30 border border-border rounded-lg py-4 px-5">
            <InfoField label="작가명" value={row.writer_name} />
            <InfoField label="거래처" value={row.client_name} />
            <InfoField label="거래명" value={row.title} />
          </div>

          {/* 항목 내역 표 */}
          <div className="border border-border rounded-lg overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-primary/10 border-b border-border">
                <tr className="text-center text-muted-foreground">
                  <th className="px-3 py-2 font-medium">작업내용</th>
                  <th className="px-3 py-2 font-medium">지급액</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {row.items.map((it, idx) => {
                  // "[섹션] 내용" → 섹션 윗줄, 내용 아랫줄 (가운데 정렬)
                  const { category, body } = parseWorkContent(it.description);
                  return (
                    <tr key={idx} className="text-center text-foreground">
                      <td className="px-3 py-2 break-keep">
                        {category && (
                          <span className="block text-[10px] font-medium text-muted-foreground">[{category}]</span>
                        )}
                        <span className="block">{body || '-'}</span>
                      </td>
                      <td className="px-3 py-2 tabular-nums whitespace-nowrap">{formatWon(it.writer_pay)}</td>
                    </tr>
                  );
                })}
                {row.items.length === 0 && (
                  <tr>
                    <td colSpan={2} className="px-3 py-4 text-center text-muted-foreground">
                      항목 내역이 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot className="border-t border-border bg-muted/30">
                <tr className="text-center font-semibold text-foreground">
                  <td className="px-3 py-2">합계</td>
                  <td className="px-3 py-2 tabular-nums whitespace-nowrap">{formatWon(row.writer_pay)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* 푸터 — 정산서 생성 버튼(좌측 하단, 구분선 없이) */}
        {onGenerate && (
          <div className="flex justify-start px-6 py-3">
            <button
              onClick={onGenerate}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5" /> 정산서 생성
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
