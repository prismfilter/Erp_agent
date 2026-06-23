'use client';

// 거래처 상세 — 프로젝트 탭. 해당 거래처와 진행한 청구서(거래) 이력을 읽기전용 표로.
// 합계는 청구서 계산 로직(calcInvoiceTotals) 재사용, 상태 라벨/색은 InvoiceStatusSelect 재사용.

import { useEffect, useState, useCallback } from 'react';
import type { Invoice } from '@/types/invoice';
import { calcInvoiceTotals } from '@/lib/invoice/calculator';
import { STATUS_LABEL, STATUS_STYLE } from '@/components/invoice/InvoiceStatusSelect';

interface ClientProjectsTabProps {
  clientId: string;
}

export function ClientProjectsTab({ clientId }: ClientProjectsTabProps) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInvoices = useCallback(async () => {
    try {
      const res = await fetch(`/api/invoices?client_id=${clientId}`);
      if (!res.ok) throw new Error('프로젝트 내역을 불러올 수 없습니다.');
      setInvoices((await res.json()).invoices || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [clientId]);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- async fetch (마이크로태스크에서 setState)
  useEffect(() => { fetchInvoices(); }, [fetchInvoices]);

  if (isLoading) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin rounded-full h-6 w-6 border-2 border-border border-t-primary mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">프로젝트 내역 로딩 중...</p>
      </div>
    );
  }
  if (error) {
    return <div className="p-8 text-center"><p className="text-red-400 text-sm">오류: {error}</p></div>;
  }
  if (invoices.length === 0) {
    return <div className="p-8 text-center"><p className="text-muted-foreground text-sm">진행한 프로젝트(청구서)가 없습니다.</p></div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-primary/10 border-b border-border">
          <tr>
            <th className="px-4 py-3 text-center font-bold text-foreground text-xs uppercase">거래명</th>
            <th className="px-4 py-3 text-center font-bold text-foreground text-xs uppercase">일자</th>
            <th className="px-4 py-3 text-center font-bold text-foreground text-xs uppercase">상태</th>
            <th className="px-4 py-3 text-center font-bold text-foreground text-xs uppercase">공급가액</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {invoices.map((inv) => {
            const totals = calcInvoiceTotals(inv.items ?? []);
            return (
              <tr key={inv.id} className="hover:bg-primary/5">
                <td className="px-4 py-3 text-center text-foreground">{inv.title || '-'}</td>
                <td className="px-4 py-3 text-center text-muted-foreground text-xs">
                  {new Date(inv.invoice_date).toLocaleDateString('ko-KR')}
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${STATUS_STYLE[inv.status]}`}>
                    {STATUS_LABEL[inv.status]}
                  </span>
                </td>
                <td className="px-4 py-3 text-center tabular-nums text-foreground">
                  {totals.supplyTotal.toLocaleString('ko-KR')}원
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
