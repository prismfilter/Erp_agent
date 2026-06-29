'use client';

// 거래처 청구서 목록 — 필터·검색·복제·삭제

import { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import type { Invoice, InvoiceStatus, Client } from '@/types/invoice';
import { PageHeader } from '@/components/layout/PageHeader';
import { calcInvoiceTotals } from '@/lib/invoice/calculator';
import { formatWon } from '@/lib/settlement/calculator';
import { useTableSort } from '@/hooks/useTableSort';
import { SortableHeader } from '@/components/ui/SortableHeader';
import { writerSummary } from '@/lib/invoice/writerSummary';
import {
  InvoiceStatusSelect,
  STATUS_LABEL,
  INVOICE_STATUS_ORDER,
} from '@/components/invoice/InvoiceStatusSelect';

type StatusTab = '전체' | InvoiceStatus;

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusTab, setStatusTab] = useState<StatusTab>('전체');
  const [clientFilter, setClientFilter] = useState('');
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState<string | null>(null);

  const fetchInvoices = useCallback(async () => {
    try {
      const res = await fetch('/api/invoices');
      if (!res.ok) throw new Error('목록을 불러올 수 없습니다.');
      const data = await res.json();
      setInvoices(data.invoices || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // async fetch라 setState는 마이크로태스크에서 실행 (동기 cascading render 아님)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchInvoices();
    fetch('/api/clients').then(async (r) => {
      if (r.ok) setClients((await r.json()).clients || []);
    });
  }, [fetchInvoices]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  };

  // 상태 인라인 변경 — 낙관적 갱신 후 PATCH, 실패 시 롤백
  const handleStatusChange = async (id: string, status: InvoiceStatus) => {
    const prev = invoices;
    setInvoices((list) => list.map((inv) => (inv.id === id ? { ...inv, status } : inv)));
    try {
      const res = await fetch(`/api/invoices/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error();
      showToast(`상태 변경 · ${STATUS_LABEL[status]}`);
    } catch {
      setInvoices(prev); // 롤백
      showToast('상태 변경 실패');
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`"${title}" 청구서를 삭제할까요?\n삭제 후 복구할 수 없습니다.`)) return;
    const res = await fetch(`/api/invoices/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setInvoices((prev) => prev.filter((inv) => inv.id !== id));
      showToast('삭제 완료');
    } else {
      showToast('삭제 실패');
    }
  };

  // 정렬: 날짜·거래처·거래명·총합계·상태
  const { sortKey, dir, toggle, sortRows } = useTableSort<Invoice>({
    date: (inv) => inv.invoice_date,
    client: (inv) => inv.client?.name ?? '',
    title: (inv) => inv.title,
    total: (inv) => calcInvoiceTotals(inv.items ?? []).grandTotal,
    status: (inv) => inv.status,
  }, 'pf_sort_invoices');

  // 필터링 + 정렬
  const filtered = useMemo(() => {
    const base = invoices.filter((inv) => {
      if (statusTab !== '전체' && inv.status !== statusTab) return false;
      if (clientFilter && inv.client_id !== clientFilter) return false;
      if (search && !inv.title.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
    return sortRows(base);
  }, [invoices, statusTab, clientFilter, search, sortRows]);

  const tabCount = (tab: StatusTab) =>
    tab === '전체' ? invoices.length : invoices.filter((i) => i.status === tab).length;

  return (
    <div className="space-y-6">
      <PageHeader
        divider={false}
        title="거래처 청구서"
        description="외부 발송용 청구서 작성 및 관리"
        actions={
          <Link
            href="/invoices/new"
            className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition font-medium"
          >
            + 새 청구서
          </Link>
        }
      />

      {/* 상태 탭 */}
      <div className="flex gap-2 border-b border-border overflow-x-auto">
        {(['전체', ...INVOICE_STATUS_ORDER] as StatusTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setStatusTab(tab)}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition cursor-pointer whitespace-nowrap ${
              statusTab === tab
                ? 'border-b-primary text-primary'
                : 'border-b-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab === '전체' ? `전체 (${tabCount(tab)})` : `${STATUS_LABEL[tab]} (${tabCount(tab)})`}
          </button>
        ))}
      </div>

      {/* 필터 행 */}
      <div className="flex flex-wrap gap-2">
        <select
          value={clientFilter}
          onChange={(e) => setClientFilter(e.target.value)}
          className="px-3 py-2 text-sm bg-background border border-border rounded-lg outline-none focus:border-primary text-foreground"
        >
          <option value="">모든 거래처</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="거래명 검색..."
          className="flex-1 min-w-[200px] px-3 py-2 text-sm bg-background border border-border rounded-lg outline-none focus:border-primary text-foreground"
        />
      </div>

      {/* 테이블 */}
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
            <p className="text-muted-foreground">청구서가 없습니다.</p>
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
                  <SortableHeader label="총 합계" sortKey="total" activeKey={sortKey} dir={dir} onSort={toggle} align="center" className="px-4 py-3 text-xs uppercase" />
                  <SortableHeader label="상태" sortKey="status" activeKey={sortKey} dir={dir} onSort={toggle} align="center" className="px-4 py-3 text-xs uppercase" />
                  <th className="px-4 py-3 text-center font-bold text-foreground text-xs uppercase">액션</th>
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
                        <Link href={`/invoices/${inv.id}`} className="text-foreground hover:text-primary transition">
                          {inv.title}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        {writerSummary(inv.items ?? [])}
                      </td>
                      <td className="px-4 py-3 text-center text-foreground font-medium tabular-nums whitespace-nowrap">
                        {formatWon(totals.grandTotal)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <InvoiceStatusSelect
                          value={inv.status}
                          onChange={(status) => handleStatusChange(inv.id, status)}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1 text-xs">
                          <Link href={`/invoices/${inv.id}`} className="px-2 py-1 text-muted-foreground hover:text-foreground transition cursor-pointer" title="보기">보기</Link>
                          <button onClick={() => handleDelete(inv.id, inv.title)} className="px-2 py-1 text-red-400 hover:text-red-300 transition cursor-pointer" title="삭제">삭제</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-foreground text-background text-sm px-4 py-2 rounded-full shadow-lg z-50 pointer-events-none">
          {toast}
        </div>
      )}
    </div>
  );
}
