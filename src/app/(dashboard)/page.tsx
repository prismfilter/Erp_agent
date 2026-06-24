'use client';

// 홈 피드 — 현황 개요 최상단, 올해 누적 수입·카테고리 도넛·매출 달력 중심 재구성
// 데이터: paid 청구서(+price-items) · 작가 · 저작물 · 거래처

import { useEffect, useState, useMemo } from 'react';
import type { Invoice, PriceItem, Writer, WorkWriterGroup, Client } from '@/types/invoice';
import {
  aggregateRevenue,
  buildCategorySlices,
  buildMonthlySeries,
} from '@/lib/revenue/aggregator';
import { HeroRevenueCard } from '@/components/home/HeroRevenueCard';
import { OverviewKpis } from '@/components/home/OverviewKpis';
import { CategoryDonut } from '@/components/home/CategoryDonut';
import { RevenueCalendarMonth } from '@/components/home/RevenueCalendarMonth';

export default function HomePage() {
  const [loading, setLoading] = useState(true);
  const [paidInvoices, setPaidInvoices] = useState<Invoice[]>([]);
  const [priceItems, setPriceItems] = useState<PriceItem[]>([]);
  const [writers, setWriters] = useState<Writer[]>([]);
  const [workGroups, setWorkGroups] = useState<WorkWriterGroup[]>([]);
  const [clients, setClients] = useState<Client[]>([]);

  // 연도: 장기 실행 stale 방지를 위해 컴포넌트 내부에서 산출
  const year = new Date().getFullYear();

  // 데이터 일괄 fetch — paid 청구서 + 프라이스 테이블 + 작가 + 저작물 + 거래처
  useEffect(() => {
    (async () => {
      try {
        const [invRes, priceRes, writerRes, worksRes, clientRes] = await Promise.all([
          fetch('/api/invoices?status=paid'),
          fetch('/api/price-items?all=1'),
          fetch('/api/writers'),
          fetch('/api/works/writers'),
          fetch('/api/clients'),
        ]);

        const [invJson, priceJson, writerJson, worksJson, clientJson] = await Promise.all([
          invRes.ok ? invRes.json() : Promise.resolve({ invoices: [] }),
          priceRes.ok ? priceRes.json() : Promise.resolve({ priceItems: [] }),
          writerRes.ok ? writerRes.json() : Promise.resolve({ writers: [] }),
          worksRes.ok ? worksRes.json() : Promise.resolve({ writers: [] }),
          clientRes.ok ? clientRes.json() : Promise.resolve({ clients: [] }),
        ]);

        setPaidInvoices(invJson.invoices ?? []);
        setPriceItems(priceJson.priceItems ?? []);
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

  // 집계 — aggregateRevenue(paid 청구서, 프라이스 테이블) 기반
  const home = useMemo(() => {
    const data = aggregateRevenue(paidInvoices, priceItems);
    const total = data.byYear[year] ?? 0;
    const prevTotal = data.byYear[year - 1] ?? 0;
    const monthly = buildMonthlySeries(data.byMonth, year);

    // 도넛: 실제 매출 카테고리(귀속금액) — 합계는 히어로 누적수입과 일치
    const slices = buildCategorySlices(data.byCategory, year);

    // 올해 paid 청구서 건수
    const paidThisYear = paidInvoices.filter(
      (inv) => new Date(inv.invoice_date ?? '').getFullYear() === year,
    );
    const settledCount = paidThisYear.length;

    return { total, prevTotal, monthly, slices, settledCount, byDay: data.byDay, years: data.years };
  }, [paidInvoices, priceItems, year]);

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
          <h1 className="text-3xl font-bold text-foreground">홈 피드</h1>
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
          worksCount={worksCount}
          writersCount={writers.length}
          clientsCount={clients.length}
          clientsDelta={0}
        />
      </div>

      {/* 2) 카테고리 도넛 + 매출 달력 */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1.45fr]">
        <CategoryDonut slices={home.slices} />
        <RevenueCalendarMonth byDay={home.byDay} years={home.years} />
      </div>
    </div>
  );
}
