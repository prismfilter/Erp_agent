// 매출 집계 로직 (순수 함수)
// 비즈니스 규칙:
// - 집계 대상: status='paid'(입금완료) 청구서만
// - 매출 금액: 내부 지급서 기준 귀속금액(C) = Σ(공급가액 − 작가지급액)
// - 카테고리: invoice_items.price_item_id → price_items.category (null이면 '커스텀')

import type { Invoice, PriceItem } from '@/types/invoice';
import { getInternalItems, calcItemBreakdown } from '@/lib/invoice/calculator';

// 차트 표시 순서 고정 (프라이스 테이블 카테고리 + 커스텀)
export const REVENUE_CATEGORIES = [
  '앨범',
  '방송·공연·시상식',
  '광고',
  '기타',
  '밴드',
  '밴드(플레디스)',
  '커스텀',
] as const;

export interface QuarterRevenue {
  total: number; // 귀속금액 합
  count: number; // 청구서 건수
}

export interface RevenueData {
  byQuarter: Record<string, QuarterRevenue>;          // 'YYYY-Q1' → 매출·건수
  byMonth: Record<string, QuarterRevenue>;            // 'YYYY-1' ~ 'YYYY-12' → 매출·건수
  byYear: Record<number, number>;                     // 연도 → 매출 합
  byCategory: Record<string, Record<number, number>>; // 카테고리 → (연도 → 매출 합)
  years: number[];                                    // 데이터 존재 연도 (내림차순)
}

// invoice_date('YYYY-MM-DD')에서 연도·월·분기 추출 — 타임존 이슈 없는 문자열 파싱
function parseYearMonth(invoiceDate: string): { year: number; month: number; quarter: number } {
  const year = parseInt(invoiceDate.slice(0, 4), 10);
  const month = parseInt(invoiceDate.slice(5, 7), 10);
  return { year, month, quarter: Math.ceil(month / 3) };
}

export function aggregateRevenue(paidInvoices: Invoice[], priceItems: PriceItem[]): RevenueData {
  const priceItemCategory = new Map<string, string>();
  priceItems.forEach((p) => priceItemCategory.set(p.id, p.category));

  const byQuarter: Record<string, QuarterRevenue> = {};
  const byMonth: Record<string, QuarterRevenue> = {};
  const byYear: Record<number, number> = {};
  const byCategory: Record<string, Record<number, number>> = {};
  const yearSet = new Set<number>();

  for (const inv of paidInvoices) {
    if (!inv.invoice_date) continue;
    const { year, month, quarter } = parseYearMonth(inv.invoice_date);
    const qKey = `${year}-Q${quarter}`;
    const mKey = `${year}-${month}`;
    yearSet.add(year);

    const internal = getInternalItems(inv.items ?? []);
    let invoiceTotal = 0;

    for (const it of internal) {
      const attribution = calcItemBreakdown(it).attribution;
      invoiceTotal += attribution;

      // 카테고리 분류 (커스텀·할인 행은 price_item_id가 null)
      const category = it.price_item_id
        ? priceItemCategory.get(it.price_item_id) ?? '커스텀'
        : '커스텀';
      if (!byCategory[category]) byCategory[category] = {};
      byCategory[category][year] = (byCategory[category][year] ?? 0) + attribution;
    }

    if (!byQuarter[qKey]) byQuarter[qKey] = { total: 0, count: 0 };
    byQuarter[qKey].total += invoiceTotal;
    byQuarter[qKey].count += 1;

    if (!byMonth[mKey]) byMonth[mKey] = { total: 0, count: 0 };
    byMonth[mKey].total += invoiceTotal;
    byMonth[mKey].count += 1;

    byYear[year] = (byYear[year] ?? 0) + invoiceTotal;
  }

  return {
    byQuarter,
    byMonth,
    byYear,
    byCategory,
    years: Array.from(yearSet).sort((a, b) => b - a),
  };
}

// 분기 매출 조회 헬퍼 (없으면 0)
export function getQuarter(data: RevenueData, year: number, quarter: number): QuarterRevenue {
  return data.byQuarter[`${year}-Q${quarter}`] ?? { total: 0, count: 0 };
}

// 월 매출 조회 헬퍼 (없으면 0) — month는 1~12
export function getMonth(data: RevenueData, year: number, month: number): QuarterRevenue {
  return data.byMonth[`${year}-${month}`] ?? { total: 0, count: 0 };
}

// 전년 동기 대비 증감률 (%) — 전년 0이면 null
export function calcYoY(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

// ── 홈 피드 도넛/달력 헬퍼 ─────────────────────────────────────────
// 도넛 3분류. ⚠️ 용역은 청구서가 아니라 용역정산서(작가지급액) 합계에서 옴(대표님 지시).
// 저작권료/기타는 청구서 귀속금액의 byCategory에서 분류. 금액 성격이 달라 단순 합은 '매출 구성'이지 누적수입이 아님.
export type DonutBucket = '저작권료' | '용역' | '기타';

// 청구서 항목 카테고리 → 저작권료|기타 (용역은 별도 소스라 여기서 분류하지 않음)
export function classifyDonutCategory(
  category: string,
  _itemName: string,
): Exclude<DonutBucket, '용역'> {
  if (category === '기타' || category === '커스텀') return '기타';
  return '저작권료';
}

// 도넛 3버킷 금액(저작권료·용역·기타 순). serviceTotal = 해당 연도 용역정산 합계.
export function buildDonutBuckets(
  byCategory: RevenueData['byCategory'],
  year: number,
  serviceTotal: number,
): { bucket: DonutBucket; amount: number }[] {
  let royalty = 0;
  let etc = 0;
  for (const category of Object.keys(byCategory)) {
    const amount = byCategory[category]?.[year] ?? 0;
    if (amount === 0) continue;
    if (classifyDonutCategory(category, '') === '기타') etc += amount;
    else royalty += amount;
  }
  return [
    { bucket: '저작권료', amount: royalty },
    { bucket: '용역', amount: serviceTotal },
    { bucket: '기타', amount: etc },
  ];
}

// 1~12월 매출 시리즈(없는 달은 0)
export function buildMonthlySeries(
  byMonth: RevenueData['byMonth'],
  year: number,
): { month: number; total: number }[] {
  const series: { month: number; total: number }[] = [];
  for (let month = 1; month <= 12; month++) {
    series.push({ month, total: byMonth[`${year}-${month}`]?.total ?? 0 });
  }
  return series;
}
