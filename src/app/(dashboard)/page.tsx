'use client';

// 홈 피드 — 실데이터 연동 대시보드
// 데이터: 용역 정산(service_settlements) · 작가 마스터(writers) · 저작물(music_works) · 청구서(invoices)
// 정산/청구서가 아직 없으면 0·빈 상태로 정직하게 표시하고, 데이터가 생기면 자동 반영된다.

import { useEffect, useState, useMemo, useCallback } from 'react';
import { Users, Music, ClipboardList, Wallet, ReceiptText } from 'lucide-react';
import type { ServiceSettlement, Writer, Invoice, InvoiceItem, WorkWriterGroup } from '@/types/invoice';
import { formatWon } from '@/lib/settlement/calculator';
import { calcInvoiceTotals } from '@/lib/invoice/calculator';

// 날짜 문자열 → { 연도, 분기 }
function quarterOf(dateStr: string): { year: number; q: number } {
  const d = new Date(dateStr);
  return { year: d.getFullYear(), q: Math.floor(d.getMonth() / 3) + 1 };
}

function todayLabel(): string {
  const d = new Date();
  return `${d.getFullYear()}년 ${String(d.getMonth() + 1).padStart(2, '0')}월 ${String(d.getDate()).padStart(2, '0')}일`;
}

export default function HomePage() {
  const [loading, setLoading] = useState(true);
  const [settlements, setSettlements] = useState<ServiceSettlement[]>([]);
  const [writers, setWriters] = useState<Writer[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [workCount, setWorkCount] = useState(0);

  const load = useCallback(async () => {
    const fetchList = async <T,>(url: string, key: string): Promise<T[]> => {
      try {
        const res = await fetch(url);
        if (!res.ok) return [];
        const data = await res.json();
        return (data[key] ?? []) as T[];
      } catch {
        return [];
      }
    };
    const [setl, wr, inv, works] = await Promise.all([
      fetchList<ServiceSettlement>('/api/settlements/service', 'settlements'),
      fetchList<Writer>('/api/writers', 'writers'),
      fetchList<Invoice>('/api/invoices', 'invoices'),
      fetchList<WorkWriterGroup>('/api/works/writers', 'writers'),
    ]);
    setSettlements(setl);
    setWriters(wr);
    setInvoices(inv);
    setWorkCount(works.reduce((sum, w) => sum + w.count, 0));
    setLoading(false);
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- async fetch (마이크로태스크에서 setState)
  useEffect(() => { load(); }, [load]);

  const stats = useMemo(() => {
    const totalSettlement = settlements.reduce((sum, s) => sum + (s.total_amount ?? 0), 0);
    const now = new Date();
    const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const thisMonthRevenue = invoices
      .filter((i) => i.status === 'paid' && (i.paid_at ?? '').startsWith(ym))
      .reduce((sum, i) => sum + calcInvoiceTotals((i.items ?? []) as InvoiceItem[]).supplyTotal, 0);

    const year = now.getFullYear();
    const currentQ = Math.floor(now.getMonth() / 3) + 1;
    const quarters = [1, 2, 3, 4].map((q) => {
      const amount = settlements
        .filter((s) => {
          const { year: y, q: sq } = quarterOf(s.period_end || s.period_start);
          return y === year && sq === q;
        })
        .reduce((sum, s) => sum + (s.total_amount ?? 0), 0);
      const status = amount > 0 ? '완료' : q > currentQ ? '예정' : q === currentQ ? '진행중' : '정산 없음';
      return { quarter: `${year} Q${q}`, amount, status };
    });
    const maxQuarter = Math.max(1, ...quarters.map((x) => x.amount));
    return { totalSettlement, thisMonthRevenue, year, quarters, maxQuarter };
  }, [settlements, invoices]);

  const recent = useMemo(
    () =>
      settlements.slice(0, 5).map((s) => {
        const { year, q } = quarterOf(s.period_start);
        return {
          id: s.id,
          writer: s.writer_name,
          quarter: `${year} Q${q}`,
          total: s.total_amount ?? 0,
          date: (s.created_at ?? '').slice(0, 10),
        };
      }),
    [settlements]
  );

  const overview = [
    { label: '등록 작가', value: `${writers.length}`, Icon: Users, color: 'text-teal-500' },
    { label: '관리 저작물', value: `${workCount.toLocaleString()}곡`, Icon: Music, color: 'text-fuchsia-500' },
    { label: '처리 정산', value: `${settlements.length}`, Icon: ClipboardList, color: 'text-violet-500' },
    { label: '이달 수입', value: formatWon(stats.thisMonthRevenue), Icon: Wallet, color: 'text-emerald-500' },
  ];

  return (
    <div className="space-y-6">
      {/* 섹션 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">홈 피드</h1>
          <p className="text-muted-foreground text-sm">{todayLabel()} • 프리즘필터 뮤직그룹 정산 현황</p>
        </div>
      </div>

      {/* KPI 카드 */}
      <div className="bg-card border border-border rounded-lg p-6">
        <h3 className="text-sm font-semibold text-muted-foreground mb-4">정산 요약</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="border-l-4 border-l-primary pl-4">
            <p className="text-xs text-muted-foreground mb-1">총 정산액</p>
            <p className="text-2xl font-bold text-foreground tabular-nums">{loading ? '—' : formatWon(stats.totalSettlement)}</p>
          </div>
          <div className="border-l-4 border-l-primary pl-4">
            <p className="text-xs text-muted-foreground mb-1">처리 건수</p>
            <p className="text-2xl font-bold text-foreground tabular-nums">{loading ? '—' : settlements.length}</p>
          </div>
          <div className="border-l-4 border-l-primary pl-4">
            <p className="text-xs text-muted-foreground mb-1">작가 수</p>
            <p className="text-2xl font-bold text-foreground tabular-nums">{loading ? '—' : writers.length}</p>
          </div>
        </div>
      </div>

      {/* 개요 카드 */}
      <div>
        <h2 className="text-sm font-bold text-foreground mb-4">현황 개요</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {overview.map((item) => {
            const Icon = item.Icon;
            return (
              <div key={item.label} className="bg-card border border-border rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">{item.label}</p>
                    <p className="text-2xl font-bold text-foreground tabular-nums">{loading ? '—' : item.value}</p>
                  </div>
                  <Icon className={`w-6 h-6 shrink-0 ${item.color}`} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 분기별 정산 현황 */}
      <div>
        <h2 className="text-sm font-bold text-foreground mb-4">분기별 정산 현황 <span className="text-xs text-muted-foreground">· {stats.year}</span></h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {stats.quarters.map((q) => {
            const pct = Math.round((q.amount / stats.maxQuarter) * 100);
            return (
              <div key={q.quarter} className="bg-card border border-border rounded-lg p-4">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-semibold text-foreground">{q.quarter}</h3>
                </div>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between mb-2 text-xs">
                      <span className="text-muted-foreground">{q.status}</span>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${q.amount > 0 ? 'bg-primary text-primary-foreground' : 'bg-primary/10 text-muted-foreground'}`}>
                        {pct}%
                      </span>
                    </div>
                    <div className="h-1.5 bg-primary/10 rounded overflow-hidden">
                      <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                  <div className="pt-3 border-t border-border">
                    <p className="text-xs text-muted-foreground mb-1">정산액</p>
                    <p className="text-lg font-bold text-foreground tabular-nums">{loading ? '—' : formatWon(q.amount)}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 최근 정산 */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="border-b border-border p-5">
          <h3 className="font-semibold text-foreground">최근 정산</h3>
        </div>
        {loading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">데이터 로딩 중...</div>
        ) : recent.length === 0 ? (
          <div className="p-10 text-center">
            <ReceiptText className="w-8 h-8 mx-auto mb-2 text-muted-foreground" aria-hidden="true" />
            <p className="text-muted-foreground text-sm">아직 정산 내역이 없습니다.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-primary/10">
                <tr>
                  <th className="px-6 py-3 text-left font-bold text-foreground text-xs uppercase">작가명</th>
                  <th className="px-6 py-3 text-left font-bold text-foreground text-xs uppercase">정산분기</th>
                  <th className="px-6 py-3 text-right font-bold text-foreground text-xs uppercase">지급액</th>
                  <th className="px-6 py-3 text-center font-bold text-foreground text-xs uppercase">상태</th>
                  <th className="px-6 py-3 text-left font-bold text-foreground text-xs uppercase">날짜</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {recent.map((r) => (
                  <tr key={r.id} className="hover:bg-primary/5">
                    <td className="px-6 py-4 text-foreground">{r.writer}</td>
                    <td className="px-6 py-4 text-foreground">{r.quarter}</td>
                    <td className="px-6 py-4 text-foreground font-semibold text-right tabular-nums">{formatWon(r.total)}</td>
                    <td className="px-6 py-4 text-center"><span className="bg-green-500/20 text-green-400 px-2 py-1 rounded text-xs font-medium">완료</span></td>
                    <td className="px-6 py-4 text-foreground tabular-nums">{r.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
