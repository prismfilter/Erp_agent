'use client';

// 용역 정산 — 작가 용역 요율(%) 기반, 입금 완료 건을 기간별로 모아 정산
// (+ 용역 정산) 버튼 → 팝업에서 작가·기간 선택 → 정산 실행 → 목록 누적

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Briefcase } from 'lucide-react';
import { ServiceSettlementModal } from '@/components/settlement/ServiceSettlementModal';
import { getInternalItems } from '@/lib/invoice/calculator';
import { formatWon } from '@/lib/settlement/calculator';
import type { Invoice, Writer, ServiceSettlement } from '@/types/invoice';

export default function ServiceSettlementPage() {
  const router = useRouter();
  const [settlements, setSettlements] = useState<ServiceSettlement[]>([]);
  const [writerOptions, setWriterOptions] = useState<Writer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const fetchSettlements = useCallback(async () => {
    try {
      const res = await fetch('/api/settlements/service');
      if (!res.ok) throw new Error('정산 목록을 불러올 수 없습니다.');
      setSettlements((await res.json()).settlements || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 작가 후보 = 작가 마스터 ∪ 청구서 내부 항목 작업자명
  const fetchWriterOptions = useCallback(async () => {
    const [writersRes, invoicesRes] = await Promise.all([
      fetch('/api/writers'),
      fetch('/api/invoices'),
    ]);
    const writers: Writer[] = writersRes.ok ? (await writersRes.json()).writers || [] : [];
    const invoices: Invoice[] = invoicesRes.ok ? (await invoicesRes.json()).invoices || [] : [];

    const masterNames = new Set(writers.map((w) => w.name));
    const extraNames = new Set<string>();
    invoices.forEach((inv) => {
      getInternalItems(inv.items ?? []).forEach((it) => {
        it.writer_names.split(',').map((n) => n.trim()).filter(Boolean).forEach((n) => {
          if (!masterNames.has(n)) extraNames.add(n);
        });
      });
    });

    const extras: Writer[] = Array.from(extraNames).map((n) => ({
      id: `worker-${n}`,
      name: n,
      writer_type: '일반작가',
      fee_rate: 0,
      status: 'active',
      created_at: '',
    }));
    setWriterOptions([...writers, ...extras]);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async fetch라 setState는 마이크로태스크에서 실행
    fetchSettlements();
    fetchWriterOptions();
  }, [fetchSettlements, fetchWriterOptions]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const handleCreated = (settlement: ServiceSettlement) => {
    setSettlements((prev) => [settlement, ...prev]);
    setShowModal(false);
    showToast(`${settlement.writer_name} 정산 완료 · ${formatWon(settlement.total_amount)}`);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <Briefcase className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-2xl font-bold">용역 정산</h1>
            <p className="text-sm text-muted-foreground">입금 완료된 용역을 작가·기간별로 정산합니다.</p>
          </div>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center bg-blue-600 text-white px-4 py-2 rounded-lg hover:opacity-90 transition font-medium cursor-pointer"
        >
          <Plus className="w-4 h-4 mr-2" />용역 정산
        </button>
      </div>

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-border border-t-primary mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">데이터 로딩 중...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center">
            <p className="text-red-400">오류: {error}</p>
          </div>
        ) : settlements.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-muted-foreground">정산 내역이 없습니다. (+ 용역 정산)으로 시작하세요.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-primary/10 border-b border-border">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-foreground text-xs uppercase">작가명</th>
                  <th className="px-4 py-3 text-center font-semibold text-foreground text-xs uppercase">정산 기간</th>
                  <th className="px-4 py-3 text-center font-semibold text-foreground text-xs uppercase">정산 금액</th>
                  <th className="px-4 py-3 text-center font-semibold text-foreground text-xs uppercase">정산일</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {settlements.map((s) => (
                  <tr
                    key={s.id}
                    onClick={() => router.push(`/settlement/service/${s.id}`)}
                    className="hover:bg-primary/5 cursor-pointer"
                  >
                    <td className="px-4 py-3 text-foreground font-medium whitespace-nowrap">{s.writer_name}</td>
                    <td className="px-4 py-3 text-center text-muted-foreground text-xs whitespace-nowrap">
                      {s.period_start} ~ {s.period_end}
                    </td>
                    <td className="px-4 py-3 text-center text-foreground font-semibold tabular-nums whitespace-nowrap">
                      {formatWon(s.total_amount)}
                    </td>
                    <td className="px-4 py-3 text-center text-muted-foreground text-xs whitespace-nowrap">
                      {s.created_at ? s.created_at.slice(0, 10) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <ServiceSettlementModal
          writerOptions={writerOptions}
          onClose={() => setShowModal(false)}
          onCreated={handleCreated}
        />
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-foreground text-background text-sm px-4 py-2 rounded-full shadow-lg z-[210] pointer-events-none">
          {toast}
        </div>
      )}
    </div>
  );
}
