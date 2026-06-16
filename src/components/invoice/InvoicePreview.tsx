'use client';

// 청구서 미리보기 — 거래처 청구서(외부) / 내부 지급서(내부) 2종
// A4 세로 + 현대적 인보이스 레이아웃. 외부 문서엔 실명·작가지급액·귀속금액·비고 절대 미노출

import { useMemo } from 'react';
import type { Invoice } from '@/types/invoice';
import {
  calcInvoiceTotals,
  calcLineTax,
  calcItemBreakdown,
  getExternalItems,
  getInternalItems,
  stripTitlePrefix,
} from '@/lib/invoice/calculator';
import { formatWon } from '@/lib/settlement/calculator';

// 회사 고정 정보
const COMPANY = {
  name: '주식회사 프리즘필터뮤직그룹',
  bizNumber: '718-87-01509',
  address: '서울특별시 강남구 도산대로 26길 20, B2',
};

// A4 한 장을 채우기 위한 최소 표시 행 수
const MIN_ROWS = 12;

interface InvoicePreviewProps {
  invoice: Invoice;
  mode: 'external' | 'internal';
  showNegotiatedNote?: boolean; // 협의가 주석 표시 여부
}

export function InvoicePreview({ invoice, mode, showNegotiatedNote = true }: InvoicePreviewProps) {
  const items = useMemo(() => invoice.items ?? [], [invoice.items]);
  const totals = useMemo(() => calcInvoiceTotals(items), [items]);

  const displayItems = useMemo(
    () => (mode === 'external' ? getExternalItems(items) : getInternalItems(items)),
    [items, mode]
  );

  const colCount = mode === 'external' ? 5 : 7;
  const emptyRowCount = Math.max(0, MIN_ROWS - displayItems.length);
  const accountLabel = invoice.account
    ? `${invoice.account.bank_name} ${invoice.account.account_number}`
    : '-';

  return (
    <div className="invoice-print-area mx-auto w-full max-w-[794px] min-h-[1090px] bg-white text-slate-800 border border-gray-200 shadow-lg p-12 flex flex-col print:max-w-none print:min-h-0 print:shadow-none print:border-0 print:p-0">
      {/* ===== 헤더: 좌측 로고/브랜드 · 우측 타이틀 ===== */}
      <div className="flex items-start justify-between pb-6 border-b-2 border-slate-800">
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/prism-filter-logo.svg" alt="PRISM FILTER" className="w-12 h-12" />
          <div>
            <p className="text-sm font-bold tracking-wide text-slate-800">PRISM FILTER</p>
            <p className="text-[11px] text-slate-500">{COMPANY.name}</p>
          </div>
        </div>
        <div className="text-right">
          <h1 className="text-3xl font-bold tracking-tight text-slate-800">청구서</h1>
          <p className="text-xs tracking-[0.3em] text-indigo-500 font-semibold mt-0.5">INVOICE</p>
          {mode === 'internal' && (
            <span className="inline-block mt-1 text-[10px] font-semibold text-rose-500 border border-rose-300 rounded px-1.5 py-0.5">
              내부 지급서 · 대외비
            </span>
          )}
        </div>
      </div>

      {/* ===== 거래 정보 (2단) ===== */}
      <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-xs mt-6 mb-6">
        <div className="flex">
          <span className="w-16 text-slate-400 font-medium">거래처</span>
          <span className="font-semibold text-slate-700">{invoice.client?.name ?? '-'}</span>
        </div>
        <div className="flex">
          <span className="w-16 text-slate-400 font-medium">청구일</span>
          <span className="font-semibold text-slate-700">{invoice.invoice_date}</span>
        </div>
        <div className="flex col-span-2">
          <span className="w-16 text-slate-400 font-medium flex-shrink-0">거래명</span>
          <span className="font-semibold text-slate-700">{invoice.title}</span>
        </div>
        <div className="flex col-span-2">
          <span className="w-16 text-slate-400 font-medium flex-shrink-0">입금계좌</span>
          <span className="font-semibold text-slate-700">{accountLabel}</span>
        </div>
      </div>

      {/* ===== 항목 테이블 (가로줄 중심, 현대적) ===== */}
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="bg-slate-800 text-white">
            <th className="px-3 py-2.5 text-center w-10 font-semibold first:rounded-tl-md">No.</th>
            <th className="px-3 py-2.5 text-center w-24 font-semibold">작업자</th>
            <th className="px-3 py-2.5 text-left font-semibold">상세내용</th>
            <th className="px-3 py-2.5 text-right w-28 font-semibold">공급가액</th>
            {mode === 'external' ? (
              <th className="px-3 py-2.5 text-right w-24 font-semibold last:rounded-tr-md">세 액</th>
            ) : (
              <>
                <th className="px-3 py-2.5 text-right w-24 font-semibold">할인금액</th>
                <th className="px-3 py-2.5 text-right w-28 font-semibold">작가 지급액</th>
                <th className="px-3 py-2.5 text-right w-24 font-semibold last:rounded-tr-md">귀속 금액</th>
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {displayItems.map((it, idx) => {
            const bd = calcItemBreakdown(it);
            return (
            <tr key={it.id ?? idx} className="border-b border-gray-200">
              <td className="px-3 py-2 text-center tabular-nums text-slate-500">{idx + 1}</td>
              <td className="px-3 py-2 text-center text-slate-700">
                {it.writer_names || '-'}
              </td>
              <td className="px-3 py-2 text-left text-slate-700 break-keep">
                {stripTitlePrefix(it.description, invoice.title)}
                {showNegotiatedNote && it.is_negotiated && (
                  <span className="block text-[10px] text-indigo-400 mt-0.5">
                    *기존 단가와 무관하게 협의 후 책정된 금액
                  </span>
                )}
              </td>
              {mode === 'external' ? (
                <>
                  {/* 외부: 공급가액 = 할인 반영된 순매출 */}
                  <td className="px-3 py-2 text-right tabular-nums text-slate-700 whitespace-nowrap">
                    {formatWon(bd.netSupply)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-slate-500 whitespace-nowrap">
                    {formatWon(calcLineTax(bd.netSupply))}
                  </td>
                </>
              ) : (
                <>
                  {/* 내부: 공급가액(할인 전) | 할인 | 작가지급액 | 귀속금액 */}
                  <td className="px-3 py-2 text-right tabular-nums text-slate-700 whitespace-nowrap">
                    {formatWon(it.supply_amount)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-slate-500 whitespace-nowrap">
                    {formatWon(it.discount_amount)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-slate-700 whitespace-nowrap">
                    {formatWon(bd.writerPay)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-slate-500 whitespace-nowrap">
                    {formatWon(bd.attribution)}
                  </td>
                </>
              )}
            </tr>
            );
          })}
          {/* 빈 행 — A4 한 장 채우기 (가로줄만) */}
          {Array.from({ length: emptyRowCount }).map((_, i) => (
            <tr key={`empty-${i}`} className="border-b border-gray-100 h-8">
              {Array.from({ length: colCount }).map((__, c) => (
                <td key={c} className="px-3 py-2">&nbsp;</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {/* ===== 합계 (우측 강조 박스) ===== */}
      <div className="flex justify-end mt-5">
        <div className="w-72">
          {mode === 'external' ? (
            <>
              <div className="flex justify-between py-1.5 text-xs text-slate-600">
                <span>총 공급가액</span>
                <span className="tabular-nums">{formatWon(totals.supplyTotal)}</span>
              </div>
              <div className="flex justify-between py-1.5 text-xs text-slate-600 border-b border-gray-200">
                <span>총 세액</span>
                <span className="tabular-nums">{formatWon(totals.taxA)}</span>
              </div>
              <div className="flex justify-between py-2.5 mt-1 px-3 bg-slate-800 text-white rounded-md">
                <span className="font-bold text-sm">총 합계</span>
                <span className="font-bold text-sm tabular-nums">{formatWon(totals.grandTotal)}</span>
              </div>
            </>
          ) : (
            <>
              <div className="flex justify-between py-1.5 text-xs text-slate-600">
                <span>총 공급가액 (A)</span>
                <span className="tabular-nums">{formatWon(totals.supplyTotal)}</span>
              </div>
              <div className="flex justify-between py-1.5 text-xs text-slate-600">
                <span>총 작가지급액 (B)</span>
                <span className="tabular-nums">{formatWon(totals.writerPayTotal)}</span>
              </div>
              <div className="flex justify-between py-1.5 text-xs text-slate-600 border-b border-gray-200">
                <span>총 귀속금액 (C)</span>
                <span className="tabular-nums">{formatWon(totals.attributionTotal)}</span>
              </div>
              <div className="flex justify-between py-2.5 mt-1 px-3 bg-slate-800 text-white rounded-md">
                <span className="font-bold text-sm">총 합계 (B+C)</span>
                <span className="font-bold text-sm tabular-nums">{formatWon(totals.grandTotal)}</span>
              </div>
              <p className="text-right text-[10px] text-slate-400 mt-1">거래처 청구서 총 합계와 일치</p>
            </>
          )}
        </div>
      </div>

      {/* 검증 경고 (화면에서만) */}
      {!totals.isValid && (
        <div className="print:hidden mt-4 bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-1">
          {totals.warnings.map((w, i) => (
            <p key={i} className="text-xs text-amber-700">⚠️ {w}</p>
          ))}
        </div>
      )}

      {/* ===== 푸터: 회사 정보 (맨 밑) ===== */}
      <div className="mt-auto pt-8">
        <div className="flex justify-between items-end text-[11px] border-t border-gray-200 pt-4">
          <div className="text-slate-600">
            <p className="font-bold text-slate-800">{COMPANY.name}</p>
            <p>{COMPANY.address}</p>
          </div>
          <div className="text-right text-slate-600">
            <p>사업자등록번호 : {COMPANY.bizNumber}</p>
            <p>입금계좌 : {accountLabel}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
