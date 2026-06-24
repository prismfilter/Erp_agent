'use client';

// 홈 피드 — 현황 개요 최상단, 올해 누적 수입·카테고리 도넛·매출 달력 중심 재구성
// 데이터: paid 청구서(+price-items) · 용역정산 · 작가 · 저작물 · 거래처

import { useEffect, useState, useMemo } from 'react';
import type { Invoice, PriceItem, ServiceSettlement, Writer, WorkWriterGroup, Client } from '@/types/invoice';
import {
  aggregateRevenue,
  buildDonutBuckets,
  buildMonthlySeries,
} from '@/lib/revenue/aggregator';
import { HeroRevenueCard } from '@/components/home/HeroRevenueCard';
import { OverviewKpis } from '@/components/home/OverviewKpis';
import { CategoryDonut } from '@/components/home/CategoryDonut';
import { RevenueCalendar } from '@/components/home/RevenueCalendar';

// 현재 연도 상수
const CURRENT_YEAR = new Date().getFullYear();

export default function HomePage() {
  const [loading, setLoading] = useState(true);
  const [paidInvoices, setPaidInvoices] = useState<Invoice[]>([]);
  const [priceItems, setPriceItems] = useState<PriceItem[]>([]);
  const [serviceSettlements, setServiceSettlements] = useState<ServiceSettlement[]>([]);
  const [writers, setWriters] = useState<Writer[]>([]);
  const [workGroups, setWorkGroups] = useState<WorkWriterGroup[]>([]);
  const [clients, setClients] = useState<Client[]>([]);

  // 데이터 일괄 fetch — paid 청구서 + 프라이스 테이블 + 용역정산 + 작가 + 저작물 + 거래처
  useEffect(() => {
    (async () => {
      try {
        const [invRes, priceRes, svcRes, writerRes, worksRes, clientRes] = await Promise.all([
          fetch('/api/invoices?status=paid'),
          fetch('/api/price-items?all=1'),
          fetch('/api/settlements/service'),
          fetch('/api/writers'),
          fetch('/api/works/writers'),
          fetch('/api/clients'),
        ]);

        const [invJson, priceJson, svcJson, writerJson, worksJson, clientJson] = await Promise.all([
          invRes.ok ? invRes.json() : Promise.resolve({ invoices: [] }),
          priceRes.ok ? priceRes.json() : Promise.resolve({ priceItems: [] }),
          svcRes.ok ? svcRes.json() : Promise.resolve({ settlements: [] }),
          writerRes.ok ? writerRes.json() : Promise.resolve({ writers: [] }),
          worksRes.ok ? worksRes.json() : Promise.resolve({ writers: [] }),
          clientRes.ok ? clientRes.json() : Promise.resolve({ clients: [] }),
        ]);

        setPaidInvoices(invJson.invoices ?? []);
        setPriceItems(priceJson.priceItems ?? []);
        setServiceSettlements(svcJson.settlements ?? []);
        setWriters(writerJson.writers ?? []);
        setWorkGroups(worksJson.writers ?? []);
        setClients(clientJson.clients ?? []);
      } catch {
        // fetch 실패 시 0/빈 상태로 자연 렌더
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const year = CURRENT_YEAR;

  // 집계 — aggregateRevenue(paid 청구서, 프라이스 테이블) 기반
  const home = useMemo(() => {
    const data = aggregateRevenue(paidInvoices, priceItems);
    const total = data.byYear[year] ?? 0;
    const prevTotal = data.byYear[year - 1] ?? 0;
    const monthly = buildMonthlySeries(data.byMonth, year);

    // 용역 = 올해 용역정산 period_start 연도 기준 total_amount 합
    const serviceTotal = serviceSettlements
      .filter((s) => new Date(s.period_start).getFullYear() === year)
      .reduce((sum, s) => sum + (s.total_amount ?? 0), 0);

    const buckets = buildDonutBuckets(data.byCategory, year, serviceTotal);

    // 올해 paid 청구서 건수 / 전체 대비 비율
    const paidThisYear = paidInvoices.filter(
      (inv) => new Date(inv.invoice_date ?? '').getFullYear() === year,
    );
    const settledCount = paidThisYear.length;
    const settledRatio =
      paidInvoices.length > 0 ? (settledCount / paidInvoices.length) * 100 : 0;

    return { total, prevTotal, monthly, buckets, settledCount, settledRatio };
  }, [paidInvoices, priceItems, serviceSettlements, year]);

  // 관리 저작물 수 = works count 합
  const worksCount = useMemo(
    () => workGroups.reduce((s, w) => s + (w.count ?? 0), 0),
    [workGroups],
  );

  // 로딩 스피너 (매출현황 패턴 동일)
  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin rounded-full h-6 w-6 border-2 border-border border-t-primary mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">홈 피드 로딩 중...</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* 페이지 헤더 */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-foreground">홈 피드</h1>
          <p className="mt-1 text-[13px] text-muted-foreground">
            프리즘 필터 뮤직그룹 · {year}년 경영 현황 한눈에 보기
          </p>
        </div>
      </div>

      {/* 1) 현황 개요 — 히어로(올해 누적 수입) + KPI 패널 */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.9fr_1fr]">
        <HeroRevenueCard
          year={year}
          total={home.total}
          prevTotal={home.prevTotal}
          monthly={home.monthly}
        />
        <OverviewKpis
          settledCount={home.settledCount}
          settledRatio={home.settledRatio}
          worksCount={worksCount}
          writersCount={writers.length}
          clientsCount={clients.length}
          clientsDelta={0}
        />
      </div>

      {/* 2) 카테고리 도넛 + 매출 달력 */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1.45fr]">
        <CategoryDonut buckets={home.buckets} />
        <RevenueCalendar monthly={home.monthly} />
      </div>
    </div>
  );
}
