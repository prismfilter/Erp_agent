'use client';

// 내부 지급서 목록 — 작가 지급 내역 중심 뷰 (같은 청구서 데이터의 내부 관점)

import { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import type { Invoice } from '@/types/invoice';
import { calcInvoiceTotals } from '@/lib/invoice/calculator';
import { formatWon } from '@/lib/settlement/calculator';
import { useTableSort } from '@/hooks/useTableSort';
import { SortableHeader } from '@/components/ui/SortableHeader';
import { writerSummary } from '@/lib/invoice/writerSummary';

export default function PayoutsPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const fetchInvoices = useCallback(async () => {
    try {
      const res = await fetch('/api/invoices');
      if (!res.ok) throw new Error('목록을 불러올 수 없습니다.');
      setInvoices((await res.json()).invoices || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- async fetch라 setState는 마이크로태스크에서 실행 (동기 cascading render 아님)
  useEffect(() => { fetchInvoices(); }, [fetchInvoices]);

  // 정렬: 날짜·거래처·거래명·총작가지급액·총귀속금액
  const { sortKey, dir, toggle, sortRows } = useTableSort<Invoice>({
    date: (inv) => inv.invoice_date,
    client: (inv) => inv.client?.name ?? '',
    title: (inv) => inv.title,
    writerPay: (inv) => calcInvoiceTotals(inv.items ?? []).writerPayTotal,
    attribution: (inv) => calcInvoiceTotals(inv.items ?? []).attributionTotal,
  }, 'pf_sort_payouts');

  const filtered = useMemo(() => {
    const base = invoices.filter((inv) => !search || inv.title.toLowerCase().includes(search.toLowerCase()));
    return sortRows(base);
  }, [invoices, search, sortRows]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">내부 지급서</h1>
        <p className="text-muted-foreground text-sm">작가별 지급액과 회사 수수료 내역 (내부용)</p>
      </div>

      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="거래명 검색..."
        className="w-full max-w-sm px-3 py-2 text-sm bg-background border border-border rounded-lg outline-none focus:border-primary text-foreground"
      />

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
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-muted-foreground">지급 내역이 없습니다.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-primary/10 border-b border-border">
                <tr>
                  <SortableHeader label="날짜" sortKey="date" activeKey={sortKey} dir={dir} onSort={toggle} className="px-4 py-3 text-xs uppercase" />
                  <SortableHeader label="거래처" sortKey="client" activeKey={sortKey} dir={dir} onSort={toggle} className="px-4 py-3 text-xs uppercase" />
                  <SortableHeader label="거래명" sortKey="title" activeKey={sortKey} dir={dir} onSort={toggle} className="px-4 py-3 text-xs uppercase" />
                  <th className="px-4 py-3 text-left font-bold text-foreground text-xs uppercase">작업자</th>
                  <SortableHeader label="총 작가지급액 (B)" sortKey="writerPay" activeKey={sortKey} dir={dir} onSort={toggle} align="center" className="px-4 py-3 text-xs uppercase" />
                  <SortableHeader label="총 회사 수수료 (C)" sortKey="attribution" activeKey={sortKey} dir={dir} onSort={toggle} align="center" className="px-4 py-3 text-xs uppercase" />
                  <th className="px-4 py-3 text-center font-bold text-foreground text-xs uppercase whitespace-nowrap">입금 여부</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((inv) => {
                  const totals = calcInvoiceTotals(inv.items ?? []);
                  return (
                    <tr key={inv.id} className="hover:bg-primary/5">
                      <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">
                        {inv.invoice_date}
                      </td>
                      <td className="px-4 py-3 text-foreground whitespace-nowrap">
                        {inv.client?.name ?? '-'}
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/invoices/${inv.id}?tab=internal`}
                          className="text-foreground hover:text-primary transition"
                        >
                          {inv.title}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        {writerSummary(inv.items ?? [])}
                      </td>
                      <td className="px-4 py-3 text-center text-foreground font-medium tabular-nums whitespace-nowrap">
                        {formatWon(totals.writerPayTotal)}
                      </td>
                      <td className="px-4 py-3 text-center text-muted-foreground tabular-nums whitespace-nowrap">
                        {formatWon(totals.attributionTotal)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {inv.status === 'paid' ? (
                          <span className="px-2.5 py-1 rounded text-xs font-medium bg-green-500/20 text-green-400 whitespace-nowrap">
                            완료
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded text-xs font-medium bg-red-500/20 text-red-400 whitespace-nowrap">
                            미완료
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
