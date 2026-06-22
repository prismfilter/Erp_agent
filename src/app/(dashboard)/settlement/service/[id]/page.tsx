'use client';

// 용역 정산서 세부 — 내부 지급서 디자인 미리보기 + PDF(인쇄) / 엑셀 다운로드

import { use, useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FileSpreadsheet, Printer, Trash2 } from 'lucide-react';
import type { ServiceSettlement } from '@/types/invoice';
import { SettlementPreview } from '@/components/settlement/SettlementPreview';
import { exportSettlementExcel } from '@/lib/settlement/settlementExcel';
import { formatWon } from '@/lib/settlement/calculator';

export default function SettlementDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [settlement, setSettlement] = useState<ServiceSettlement | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/settlements/service/${id}`);
        if (!res.ok) throw new Error((await res.json()).error || '조회 실패');
        setSettlement((await res.json()).settlement);
      } catch (err) {
        setError(err instanceof Error ? err.message : '오류가 발생했습니다.');
      } finally {
        setIsLoading(false);
      }
    })();
  }, [id]);

  const handlePrint = () => window.print();

  const handleExcel = async () => {
    if (!settlement) return;
    setExporting(true);
    try {
      await exportSettlementExcel(settlement);
    } finally {
      setExporting(false);
    }
  };

  const handleDelete = async () => {
    if (!settlement) return;
    if (!confirm(`${settlement.writer_name}의 용역 정산서를 삭제할까요?\n삭제 후 복구할 수 없습니다.`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/settlements/service/${id}`, { method: 'DELETE' });
      if (res.ok) {
        router.push('/settlement/service');
      } else {
        alert((await res.json()).error || '삭제에 실패했습니다.');
        setDeleting(false);
      }
    } catch {
      alert('삭제 중 오류가 발생했습니다.');
      setDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin rounded-full h-6 w-6 border-2 border-border border-t-primary mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">정산서 로딩 중...</p>
      </div>
    );
  }

  if (error || !settlement) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-400 mb-4">오류: {error ?? '정산서를 찾을 수 없습니다.'}</p>
        <Link href="/settlement/service" className="text-primary text-sm hover:underline">← 목록으로</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 상단 헤더 (인쇄 미포함) */}
      <div className="print:hidden flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground mb-1">{settlement.writer_name} · 용역 정산서</h1>
          <p className="text-muted-foreground text-sm">
            {settlement.period_start} ~ {settlement.period_end} · {formatWon(settlement.total_amount)} · {settlement.detail?.length ?? 0}건
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/settlement/service"
            className="px-3 py-2 text-xs border border-border rounded-lg text-foreground hover:bg-muted transition cursor-pointer"
          >
            ← 목록
          </Link>
          <button
            onClick={handleExcel}
            disabled={exporting}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs border border-border rounded-lg text-foreground hover:bg-muted transition cursor-pointer disabled:opacity-50"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" /> {exporting ? '생성 중...' : '엑셀 다운로드'}
          </button>
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" /> PDF 저장 / 인쇄
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition font-medium cursor-pointer disabled:opacity-50"
          >
            <Trash2 className="w-3.5 h-3.5" /> {deleting ? '삭제 중...' : '삭제'}
          </button>
        </div>
      </div>

      {/* 정산서 미리보기 */}
      <SettlementPreview settlement={settlement} />
    </div>
  );
}
