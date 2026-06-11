'use client';

// 청구서 미리보기 — 거래처 청구서(외부) / 내부 지급서(내부) 2종
// A4 세로 양식. 외부 문서에는 실명·작가지급액·귀속금액·비고 절대 미노출

import { useMemo } from 'react';
import type { Invoice } from '@/types/invoice';
import {
  calcInvoiceTotals,
  calcLineTax,
  calcAttribution,
  getExternalItems,
  getInternalItems,
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

  // 외부=5열, 내부=7열
  const colCount = mode === 'external' ? 5 : 7;
  // 빈 행으로 A4 채우기
  const emptyRowCount = Math.max(0, MIN_ROWS - displayItems.length);

  return (
    <div className="invoice-print-area mx-auto w-full max-w-[794px] min-h-[1090px] bg-white text-black border border-gray-400 shadow-lg p-10 flex flex-col print:max-w-none print:min-h-0 print:shadow-none print:border print:p-0">
      {/* ===== 제목 ===== */}
      <div className="text-center mb-6">
        <h1 className="text-3xl font-bold tracking-[0.5em] mb-2">청 구 서</h1>
        <p className="text-sm font-semibold">{COMPANY.name}</p>
        {mode === 'internal' && (
          <p className="text-xs text-gray-500 mt-1">— 내부 지급서 (대외비) —</p>
        )}
      </div>

      {/* ===== 거래 정보 박스 (우측 정렬) ===== */}
      <div className="flex justify-end mb-4">
        <table className="text-xs border border-gray-400 border-collapse">
          <tbody>
            <tr>
              <td className="border border-gray-400 bg-gray-100 px-3 py-1.5 font-semibold whitespace-nowrap">날짜</td>
              <td className="border border-gray-400 px-3 py-1.5 min-w-[160px]">{invoice.invoice_date}</td>
            </tr>
            <tr>
              <td className="border border-gray-400 bg-gray-100 px-3 py-1.5 font-semibold whitespace-nowrap">거래처</td>
              <td className="border border-gray-400 px-3 py-1.5">{invoice.client?.name ?? '-'}</td>
            </tr>
            <tr>
              <td className="border border-gray-400 bg-gray-100 px-3 py-1.5 font-semibold whitespace-nowrap">입금계좌</td>
              <td className="border border-gray-400 px-3 py-1.5">
                {invoice.account ? `${invoice.account.bank_name} ${invoice.account.account_number}` : '-'}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ===== 거래명 + 안내문 ===== */}
      <div className="mb-3">
        <p className="text-sm">
          <span className="font-semibold">거래명 : </span>
          {invoice.title}
        </p>
        <p className="text-xs text-gray-600 mt-1">아래와 같이 청구합니다.</p>
      </div>

      {/* ===== 항목 테이블 ===== */}
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="bg-gray-100">
            <th className="border border-gray-400 px-2 py-2 text-center w-10 font-semibold">No.</th>
            <th className="border border-gray-400 px-2 py-2 text-center w-24 font-semibold">작업자</th>
            <th className="border border-gray-400 px-2 py-2 text-center font-semibold">상세내용</th>
            <th className="border border-gray-400 px-2 py-2 text-center w-28 font-semibold">공급가액</th>
            {mode === 'external' ? (
              <th className="border border-gray-400 px-2 py-2 text-center w-24 font-semibold">세 액</th>
            ) : (
              <>
                <th className="border border-gray-400 px-2 py-2 text-center w-28 font-semibold">작가 지급액</th>
                <th className="border border-gray-400 px-2 py-2 text-center w-24 font-semibold">귀속 금액</th>
                <th className="border border-gray-400 px-2 py-2 text-center w-24 font-semibold">비고</th>
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {displayItems.map((it, idx) => (
            <tr key={it.id ?? idx}>
              <td className="border border-gray-400 px-2 py-1.5 text-center tabular-nums">{idx + 1}</td>
              <td className="border border-gray-400 px-2 py-1.5 text-center">
                {mode === 'external' ? '프리즘필터' : it.writer_names || '-'}
              </td>
              <td className="border border-gray-400 px-2 py-1.5 text-left">
                {it.description}
                {showNegotiatedNote && it.is_negotiated && (
                  <span className="block text-[10px] text-gray-500">
                    *기존 단가와 무관하게 협의 후 책정된 금액
                  </span>
                )}
              </td>
              <td className="border border-gray-400 px-2 py-1.5 text-right tabular-nums whitespace-nowrap">
                {formatWon(it.supply_amount)}
              </td>
              {mode === 'external' ? (
                <td className="border border-gray-400 px-2 py-1.5 text-right tabular-nums whitespace-nowrap">
                  {formatWon(calcLineTax(it.supply_amount))}
                </td>
              ) : (
                <>
                  <td className="border border-gray-400 px-2 py-1.5 text-right tabular-nums whitespace-nowrap">
                    {formatWon(it.writer_pay)}
                  </td>
                  <td className="border border-gray-400 px-2 py-1.5 text-right tabular-nums whitespace-nowrap">
                    {formatWon(calcAttribution(it.supply_amount, it.writer_pay))}
                  </td>
                  <td className="border border-gray-400 px-2 py-1.5 text-[10px] text-gray-600">{it.note ?? ''}</td>
                </>
              )}
            </tr>
          ))}
          {/* 빈 행 — A4 한 장 채우기 */}
          {Array.from({ length: emptyRowCount }).map((_, i) => (
            <tr key={`empty-${i}`} className="h-7">
              {Array.from({ length: colCount }).map((__, c) => (
                <td key={c} className="border border-gray-400 px-2 py-1.5">&nbsp;</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {/* ===== 합계 블록 ===== */}
      {mode === 'external' ? (
        <table className="w-full text-xs border-collapse mt-[-1px]">
          <tbody>
            <tr className="bg-gray-50">
              <td className="border border-gray-400 px-2 py-2 text-right font-semibold" colSpan={3}>총 공급가액</td>
              <td className="border border-gray-400 px-2 py-2 text-right tabular-nums whitespace-nowrap" colSpan={1}>{formatWon(totals.supplyTotal)}</td>
            </tr>
            <tr className="bg-gray-50">
              <td className="border border-gray-400 px-2 py-2 text-right font-semibold" colSpan={3}>총 세액</td>
              <td className="border border-gray-400 px-2 py-2 text-right tabular-nums whitespace-nowrap" colSpan={1}>{formatWon(totals.taxA)}</td>
            </tr>
            <tr className="bg-gray-100">
              <td className="border border-gray-400 px-2 py-2.5 text-right font-bold text-sm" colSpan={3}>총 합계</td>
              <td className="border border-gray-400 px-2 py-2.5 text-right tabular-nums font-bold text-sm whitespace-nowrap" colSpan={1}>{formatWon(totals.grandTotal)}</td>
            </tr>
          </tbody>
        </table>
      ) : (
        <table className="w-full text-xs border-collapse mt-[-1px]">
          <tbody>
            <tr className="bg-gray-50">
              <td className="border border-gray-400 px-2 py-2 text-right font-semibold" colSpan={3}>총 공급가액 (A)</td>
              <td className="border border-gray-400 px-2 py-2 text-right tabular-nums whitespace-nowrap">{formatWon(totals.supplyTotal)}</td>
              <td className="border border-gray-400 px-2 py-2 text-center text-gray-500">세 액</td>
              <td className="border border-gray-400 px-2 py-2" colSpan={2}></td>
            </tr>
            <tr className="bg-gray-50">
              <td className="border border-gray-400 px-2 py-2 text-right font-semibold" colSpan={3}>총 작가지급액 (B)</td>
              <td className="border border-gray-400 px-2 py-2 text-right tabular-nums whitespace-nowrap">{formatWon(totals.writerPayTotal)}</td>
              <td className="border border-gray-400 px-2 py-2 text-right tabular-nums text-gray-600 whitespace-nowrap" colSpan={3}>{formatWon(totals.taxB)}</td>
            </tr>
            <tr className="bg-gray-50">
              <td className="border border-gray-400 px-2 py-2 text-right font-semibold" colSpan={3}>총 귀속금액 (C)</td>
              <td className="border border-gray-400 px-2 py-2 text-right tabular-nums whitespace-nowrap">{formatWon(totals.attributionTotal)}</td>
              <td className="border border-gray-400 px-2 py-2 text-right tabular-nums text-gray-600 whitespace-nowrap" colSpan={3}>{formatWon(totals.taxC)}</td>
            </tr>
            <tr className="bg-gray-100">
              <td className="border border-gray-400 px-2 py-2.5 text-right font-bold text-sm" colSpan={3}>총 합계 (B+C)</td>
              <td className="border border-gray-400 px-2 py-2.5 text-right tabular-nums font-bold text-sm whitespace-nowrap">{formatWon(totals.grandTotal)}</td>
              <td className="border border-gray-400 px-2 py-2.5 text-center text-[10px] text-gray-500" colSpan={3}>거래처 청구서 총 합계 {formatWon(totals.grandTotal)}</td>
            </tr>
          </tbody>
        </table>
      )}

      {/* 검증 경고 (화면에서만, 인쇄 미포함) */}
      {!totals.isValid && (
        <div className="print:hidden mt-4 bg-amber-50 border border-amber-300 rounded-lg p-3 space-y-1">
          {totals.warnings.map((w, i) => (
            <p key={i} className="text-xs text-amber-700">⚠️ {w}</p>
          ))}
        </div>
      )}

      {/* ===== 푸터: 회사 정보 + 로고 ===== */}
      <div className="mt-auto pt-8">
        <div className="flex justify-between text-xs border-t-2 border-gray-700 pt-3">
          <div>
            <p className="font-semibold">{COMPANY.name}</p>
            <p className="text-gray-600">{COMPANY.address}</p>
          </div>
          <div className="text-right text-gray-700">
            <p>사업자등록번호 : {COMPANY.bizNumber}</p>
            <p>
              입금계좌 :{' '}
              {invoice.account
                ? `${invoice.account.bank_name} ${invoice.account.account_number}`
                : '-'}
            </p>
          </div>
        </div>

        {/* 하단 중앙 로고 + 회사명 */}
        <div className="flex flex-col items-center gap-2 mt-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/prism-filter-logo.svg" alt="PRISM FILTER" className="w-14 h-14" />
          <p className="text-sm font-bold tracking-wide">{COMPANY.name}</p>
        </div>
      </div>
    </div>
  );
}
