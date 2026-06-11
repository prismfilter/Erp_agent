'use client';

// 내부 지급서 목록 — 작가 지급 내역 중심 뷰 (같은 청구서 데이터의 내부 관점)

import { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import type { Invoice } from '@/types/invoice';
import { calcInvoiceTotals, getInternalItems } from '@/lib/invoice/calculator';
import { formatCurrency } from '@/lib/settlement/calculator';
import { useTableSort } from '@/hooks/useTableSort';
import { SortableHeader } from '@/components/ui/SortableHeader';

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

  useEffect(() => { fetchInvoices(); }, [fetchInvoices]);

  // 작업자 요약 (중복 제거, 최대 3명 + 외 N명)
  const writerSummary = (inv: Invoice): string => {
    const names = new Set<string>();
    getInternalItems(inv.items ?? []).forEach((it) => {
      it.writer_names.split(',').map((n) => n.trim()).filter(Boolean).forEach((n) => names.add(n));
    });
    const arr = Array.from(names);
    if (arr.length === 0) return '-';
    if (arr.length <= 3) return arr.join(', ');
    return `${arr.slice(0, 3).join(', ')} 외 ${arr.length - 3}명`;
  };

  // 정렬: 날짜·거래처·거래명·총작가지급액·총귀속금액
  const { sortKey, dir, toggle, sortRows } = useTableSort<Invoice>({
    date: (inv) => inv.invoice_date,
    client: (inv) => inv.client?.name ?? '',
    title: (inv) => inv.title,
    writerPay: (inv) => calcInvoiceTotals(inv.items ?? []).writerPayTotal,
    attribution: (inv) => calcInvoiceTotals(inv.items ?? []).attributionTotal,
  });

  const filtered = useMemo(() => {
    const base = invoices.filter((inv) => !search || inv.title.toLowerCase().includes(search.toLowerCase()));
    return sortRows(base);
  }, [invoices, search, sortRows]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">내부 지급서</h1>
        <p className="text-muted-foreground text-sm">작가별 지급액과 귀속금액 내역 (내부용)</p>
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
                  <th className="px-4 py-3 text-left font-semibold text-foreground text-xs uppercase">작업자</th>
                  <SortableHeader label="총 작가지급액 (B)" sortKey="writerPay" activeKey={sortKey} dir={dir} onSort={toggle} align="center" className="px-4 py-3 text-xs uppercase" />
                  <SortableHeader label="총 귀속금액 (C)" sortKey="attribution" activeKey={sortKey} dir={dir} onSort={toggle} align="center" className="px-4 py-3 text-xs uppercase" />
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
                        {writerSummary(inv)}
                      </td>
                      <td className="px-4 py-3 text-right text-foreground font-medium tabular-nums whitespace-nowrap">
                        {formatCurrency(totals.writerPayTotal)}원
                      </td>
                      <td className="px-4 py-3 text-right text-muted-foreground tabular-nums whitespace-nowrap">
                        {formatCurrency(totals.attributionTotal)}원
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
