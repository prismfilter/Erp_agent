'use client';

// 매출현황 대시보드
// 집계 기준: 입금완료(paid) 청구서의 내부 지급서 총 귀속금액(C)

import { useEffect, useState, useMemo, useRef } from 'react';
import { BarChart3 } from 'lucide-react';
import type { Invoice, PriceItem } from '@/types/invoice';
import { aggregateRevenue, getQuarter, calcYoY } from '@/lib/revenue/aggregator';
import { formatWon } from '@/lib/settlement/calculator';
import { QuarterlyChart } from '@/components/revenue/QuarterlyChart';
import { YearlyChart } from '@/components/revenue/YearlyChart';
import { CategoryBarChart } from '@/components/revenue/CategoryBarChart';
import { PageHeader } from '@/components/layout/PageHeader';

const CURRENT_YEAR = new Date().getFullYear();

export default function RevenuePage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [priceItems, setPriceItems] = useState<PriceItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 셀렉터 상태
  const [year, setYear] = useState(CURRENT_YEAR);
  const [quarter, setQuarter] = useState<number | null>(null); // null = 전체
  const [compare, setCompare] = useState(false);
  const [yearOpen, setYearOpen] = useState(false);
  const [quarterOpen, setQuarterOpen] = useState(false);
  const yearRef = useRef<HTMLDivElement>(null);
  const quarterRef = useRef<HTMLDivElement>(null);

  // 데이터 로드 — 입금완료 청구서 + 프라이스 테이블(카테고리 매핑용)
  useEffect(() => {
    (async () => {
      try {
        const [invRes, priceRes] = await Promise.all([
          fetch('/api/invoices?status=paid'),
          fetch('/api/price-items?all=1'),
        ]);
        if (!invRes.ok) throw new Error((await invRes.json()).error || '매출 데이터를 불러올 수 없습니다.');
        if (!priceRes.ok) throw new Error('프라이스 테이블을 불러올 수 없습니다.');
        setInvoices((await invRes.json()).invoices || []);
        setPriceItems((await priceRes.json()).priceItems || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : '오류가 발생했습니다.');
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  // 드롭다운 외부 클릭 닫기
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (yearRef.current && !yearRef.current.contains(e.target as Node)) setYearOpen(false);
      if (quarterRef.current && !quarterRef.current.contains(e.target as Node)) setQuarterOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // 집계
  const data = useMemo(() => aggregateRevenue(invoices, priceItems), [invoices, priceItems]);

  // 연도 선택지: 데이터 존재 연도 + 현재 연도 (내림차순)
  const yearOptions = useMemo(() => {
    const set = new Set<number>([...data.years, CURRENT_YEAR]);
    return Array.from(set).sort((a, b) => b - a);
  }, [data.years]);

  // 요약 수치 (선택 기간 기준)
  const summary = useMemo(() => {
    if (quarter !== null) {
      const cur = getQuarter(data, year, quarter);
      const prev = getQuarter(data, year - 1, quarter);
      return {
        label: `${year}년 Q${quarter}`,
        total: cur.total,
        count: cur.count,
        yoy: calcYoY(cur.total, prev.total),
      };
    }
    const curTotal = data.byYear[year] ?? 0;
    const prevTotal = data.byYear[year - 1] ?? 0;
    const count = [1, 2, 3, 4].reduce((s, q) => s + getQuarter(data, year, q).count, 0);
    return { label: `${year}년 전체`, total: curTotal, count, yoy: calcYoY(curTotal, prevTotal) };
  }, [data, year, quarter]);

  const yearTotal = data.byYear[year] ?? 0;

  if (isLoading) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin rounded-full h-6 w-6 border-2 border-border border-t-primary mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">매출 데이터 로딩 중...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-400">오류: {error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 헤더 + 셀렉터 */}
      <PageHeader
        title="매출현황"
        description="입금완료 청구서 기준 · 매출 = 총 귀속금액(C)"
        actions={
          <div className="flex items-center gap-2">
            {/* 연도 셀렉터 */}
            <div ref={yearRef} className="relative">
              <button
                type="button"
                onClick={() => setYearOpen((v) => !v)}
                className="px-4 py-2 text-sm font-semibold bg-card border border-border rounded-lg text-foreground hover:border-primary/50 transition cursor-pointer"
              >
                {year}년 ▾
              </button>
              {yearOpen && (
                <div className="absolute right-0 z-40 mt-1 w-28 bg-card border border-border rounded-lg shadow-xl overflow-hidden">
                  {yearOptions.map((y) => (
                    <button
                      key={y}
                      type="button"
                      onClick={() => { setYear(y); setYearOpen(false); }}
                      className={`w-full px-3 py-2 text-sm text-left hover:bg-primary/10 transition cursor-pointer ${
                        y === year ? 'text-primary font-semibold bg-primary/10' : 'text-foreground'
                      }`}
                    >
                      {y}년
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 분기 셀렉터 */}
            <div ref={quarterRef} className="relative">
              <button
                type="button"
                onClick={() => setQuarterOpen((v) => !v)}
                className="px-4 py-2 text-sm font-semibold bg-card border border-border rounded-lg text-foreground hover:border-primary/50 transition cursor-pointer"
              >
                {quarter ? `Q${quarter}` : '전체'} ▾
              </button>
              {quarterOpen && (
                <div className="absolute right-0 z-40 mt-1 w-24 bg-card border border-border rounded-lg shadow-xl overflow-hidden">
                  {[null, 1, 2, 3, 4].map((q) => (
                    <button
                      key={q ?? 'all'}
                      type="button"
                      onClick={() => { setQuarter(q); setQuarterOpen(false); }}
                      className={`w-full px-3 py-2 text-sm text-left hover:bg-primary/10 transition cursor-pointer ${
                        q === quarter ? 'text-primary font-semibold bg-primary/10' : 'text-foreground'
                      }`}
                    >
                      {q ? `Q${q}` : '전체'}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Compare 토글 */}
            <button
              type="button"
              onClick={() => setCompare((v) => !v)}
              className={`px-4 py-2 text-sm font-semibold rounded-lg border transition cursor-pointer ${
                compare
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-card text-foreground border-border hover:border-primary/50'
              }`}
              title="전년도 데이터를 반투명으로 겹쳐 비교"
            >
              ⇄ Compare
            </button>
          </div>
        }
      />

      {/* 요약 카드 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-lg p-5">
          <p className="text-xs text-muted-foreground mb-1">{summary.label} 매출</p>
          <p className="text-xl font-bold text-foreground tabular-nums">{formatWon(summary.total)}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-5">
          <p className="text-xs text-muted-foreground mb-1">청구 건수</p>
          <p className="text-xl font-bold text-foreground tabular-nums">{summary.count}건</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-5">
          <p className="text-xs text-muted-foreground mb-1">전년 동기 대비</p>
          <p
            className={`text-xl font-bold tabular-nums ${
              summary.yoy == null
                ? 'text-muted-foreground'
                : summary.yoy >= 0
                ? 'text-green-400'
                : 'text-red-400'
            }`}
          >
            {summary.yoy == null ? '—' : `${summary.yoy >= 0 ? '+' : ''}${summary.yoy.toFixed(1)}%`}
          </p>
        </div>
        <div className="bg-card border border-border rounded-lg p-5">
          <p className="text-xs text-muted-foreground mb-1">{year}년 누적 매출</p>
          <p className="text-xl font-bold text-primary tabular-nums">{formatWon(yearTotal)}</p>
        </div>
      </div>

      {/* 데이터 없음 안내 */}
      {invoices.length === 0 ? (
        <div className="bg-card border border-border rounded-lg p-10 text-center">
          <BarChart3 className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
          <h2 className="text-lg font-bold text-foreground mb-1">입금완료된 청구서가 없습니다</h2>
          <p className="text-sm text-muted-foreground">
            거래처 청구서에서 상태를 &lsquo;입금완료&rsquo;로 변경하면 매출에 집계됩니다.
          </p>
        </div>
      ) : (
        <>
          {/* 분기별 + 연도별 차트 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <QuarterlyChart
              data={data}
              year={year}
              selectedQuarter={quarter}
              compare={compare}
              onSelectQuarter={setQuarter}
            />
            <YearlyChart data={data} selectedYear={year} onSelectYear={setYear} />
          </div>

          {/* 카테고리별 가로 막대 */}
          <CategoryBarChart data={data} year={year} compare={compare} />
        </>
      )}
    </div>
  );
}
