'use client';

// 용역 정산서 미리보기 — 내부 지급서(InvoicePreview)와 동일한 A4 디자인.
// 항목이 많으면 PAGE 단위로 분할하고, 최종 합계는 마지막 페이지에만 표시한다.

import { useMemo } from 'react';
import type { ServiceSettlement } from '@/types/invoice';
import { stripTitlePrefix } from '@/lib/invoice/calculator';
import { calculateSettlement, formatWon } from '@/lib/settlement/calculator';

const COMPANY = {
  name: '주식회사 프리즘필터뮤직그룹',
  bizNumber: '718-87-01509',
  address: '서울특별시 강남구 도산대로 26길 20, B2',
};

// A4 한 장당 항목 행 수 (헤더·정보·합계 공간 고려)
const PER_PAGE = 14;

// 입금일 표시 (YYYY-MM-DD)
function fmtDate(s: string | null): string {
  if (!s) return '-';
  return s.slice(0, 10);
}

export function SettlementPreview({ settlement }: { settlement: ServiceSettlement }) {
  const detail = useMemo(() => settlement.detail ?? [], [settlement.detail]);

  // 세금 계산 (작가지급액 합 기준, 수수료 없음 — 원천징수만)
  const result = useMemo(
    () => calculateSettlement(detail.map((d) => ({ amount: d.writer_pay, rate: 0 }))),
    [detail]
  );

  // 페이지 분할
  const pages = useMemo(() => {
    const out: (typeof detail)[] = [];
    for (let i = 0; i < detail.length; i += PER_PAGE) {
      out.push(detail.slice(i, i + PER_PAGE));
    }
    return out.length > 0 ? out : [[]];
  }, [detail]);

  return (
    <div className="settlement-print-area space-y-8 print:space-y-0">
      {pages.map((pageItems, pageIdx) => {
        const isLast = pageIdx === pages.length - 1;
        const startNo = pageIdx * PER_PAGE;
        // A4 채우기 — 합계가 들어가는 마지막 페이지는 빈 행을 적게
        const emptyCount = Math.max(0, (isLast ? PER_PAGE - 4 : PER_PAGE) - pageItems.length);

        return (
          <div
            key={pageIdx}
            className="settlement-page mx-auto w-full max-w-[794px] min-h-[1090px] bg-white text-black border border-gray-200 shadow-lg p-12 flex flex-col print:max-w-none print:min-h-0 print:shadow-none print:border-0 print:p-0"
          >
            {/* ===== 헤더 ===== */}
            <div className="flex items-start justify-between pb-6 border-b-2 border-slate-800">
              <div className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/prismfilter-logo.png" alt="PRISMFILTER MUSIC GROUP" className="w-[72px] h-[72px]" />
                <div>
                  <p className="text-sm font-bold tracking-wide text-black whitespace-nowrap">PRISMFILTER MUSIC GROUP</p>
                  <p className="text-[11px] text-slate-600">{COMPANY.name}</p>
                </div>
              </div>
              <div className="text-right">
                <h1 className="text-3xl font-bold tracking-tight text-black">용역 정산서</h1>
                <p className="text-xs tracking-[0.3em] text-indigo-500 font-semibold mt-0.5">SETTLEMENT</p>
                <span className="inline-block mt-1 text-[10px] font-semibold text-slate-600 border border-slate-300 rounded px-1.5 py-0.5">
                  PAGE {pageIdx + 1} / {pages.length}
                </span>
              </div>
            </div>

            {/* ===== 정산 정보 ===== */}
            <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-xs mt-6 mb-6">
              <div className="flex">
                <span className="w-20 text-slate-500 font-medium flex-shrink-0">작가명</span>
                <span className="font-semibold text-slate-900">{settlement.writer_name}</span>
              </div>
              <div className="flex">
                <span className="w-20 text-slate-500 font-medium flex-shrink-0">건수</span>
                <span className="font-semibold text-slate-900">{detail.length}건</span>
              </div>
              <div className="flex col-span-2">
                <span className="w-20 text-slate-500 font-medium flex-shrink-0">정산 기간</span>
                <span className="font-semibold text-slate-900">
                  {settlement.period_start} ~ {settlement.period_end} <span className="text-slate-500">(입금 완료일 기준)</span>
                </span>
              </div>
            </div>

            {/* ===== 항목 테이블 ===== */}
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-slate-800 text-white">
                  <th className="px-3 py-2.5 text-center w-10 font-bold first:rounded-tl-md">No.</th>
                  <th className="px-3 py-2.5 text-center w-24 font-bold">입금일</th>
                  <th className="px-3 py-2.5 text-center w-28 font-bold">거래처</th>
                  <th className="px-3 py-2.5 text-center font-bold">작업 내용</th>
                  <th className="px-3 py-2.5 text-center w-32 font-bold last:rounded-tr-md">작가 지급액</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((d, idx) => (
                  <tr key={`${pageIdx}-${idx}`} className="border-b border-gray-200">
                    <td className="px-3 py-2 text-center tabular-nums text-slate-600">{startNo + idx + 1}</td>
                    <td className="px-3 py-2 text-center text-slate-600 whitespace-nowrap">{fmtDate(d.paid_at)}</td>
                    <td className="px-3 py-2 text-center text-slate-900">{d.client_name || '-'}</td>
                    <td className="px-3 py-2 text-center text-slate-900 break-keep">
                      <span className="text-slate-500">{d.title}</span>
                      {' · '}
                      {stripTitlePrefix(d.description, d.title)}
                    </td>
                    <td className="px-3 py-2 text-center tabular-nums text-slate-900 whitespace-nowrap">
                      {formatWon(d.writer_pay)}
                    </td>
                  </tr>
                ))}
                {/* 빈 행 — A4 채우기 */}
                {Array.from({ length: emptyCount }).map((_, i) => (
                  <tr key={`empty-${pageIdx}-${i}`} className="border-b border-gray-100 h-8">
                    {Array.from({ length: 5 }).map((__, c) => (
                      <td key={c} className="px-3 py-2">&nbsp;</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>

            {/* ===== 합계 (마지막 페이지에만) ===== */}
            {isLast && (
              <div className="flex justify-end mt-5">
                <div className="w-80">
                  <div className="flex justify-between py-1.5 text-xs text-slate-600">
                    <span>총 작가지급액</span>
                    <span className="tabular-nums">{formatWon(result.totalAmount)}</span>
                  </div>
                  <div className="flex justify-between py-1.5 text-xs text-slate-600">
                    <span>소득세 (3%)</span>
                    <span className="tabular-nums">- {formatWon(result.incomeTax)}</span>
                  </div>
                  <div className="flex justify-between py-1.5 text-xs text-slate-600 border-b border-gray-200">
                    <span>지방소득세 (0.3%)</span>
                    <span className="tabular-nums">- {formatWon(result.localIncomeTax)}</span>
                  </div>
                  <div className="flex justify-between py-2.5 mt-1 px-3 bg-slate-800 text-white rounded-md">
                    <span className="font-bold text-sm">실 수령액</span>
                    <span className="font-bold text-sm tabular-nums">{formatWon(result.netAmount)}</span>
                  </div>
                  <p className="text-right text-[10px] text-slate-500 mt-1">원천징수 3.3% 공제 후 지급액</p>
                </div>
              </div>
            )}

            {/* ===== 푸터 ===== */}
            <div className="mt-auto pt-8">
              <div className="flex justify-between items-end text-[11px] border-t border-gray-200 pt-4">
                <div className="text-slate-600">
                  <p className="font-bold text-black">{COMPANY.name}</p>
                  <p>{COMPANY.address}</p>
                </div>
                <div className="text-right text-slate-600">
                  <p>사업자등록번호 : {COMPANY.bizNumber}</p>
                  <p>발행일 : {fmtDate(settlement.created_at)}</p>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
