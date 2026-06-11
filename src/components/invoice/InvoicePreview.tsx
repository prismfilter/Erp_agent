'use client';

// 청구서 미리보기 — 거래처 청구서(외부) / 내부 지급서(내부) 2종
// 실제 엑셀 양식을 충실히 재현. 외부 문서에는 실명·작가지급액·귀속금액·비고 절대 미노출

import { useMemo } from 'react';
import type { Invoice } from '@/types/invoice';
import {
  calcInvoiceTotals,
  calcLineTax,
  calcAttribution,
  getExternalItems,
  getInternalItems,
} from '@/lib/invoice/calculator';
import { formatCurrency } from '@/lib/settlement/calculator';

// 회사 고정 정보
const COMPANY = {
  name: '주식회사 프리즘필터뮤직그룹',
  bizNumber: '718-87-01509',
  address: '서울특별시 강남구 도산대로 26길 20, B2',
};

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

  const hasNegotiated = displayItems.some((it) => it.is_negotiated);

  return (
    <div className="invoice-print-area bg-white text-black rounded-lg border border-border p-8 md:p-10 print:border-0 print:rounded-none print:p-0">
      {/* 제목 */}
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold tracking-[0.5em] mb-1">청 구 서</h1>
        <p className="text-sm font-semibold">{COMPANY.name}</p>
        {mode === 'internal' && (
          <p className="text-xs text-gray-500 mt-1">— 내부 지급서 (대외비) —</p>
        )}
      </div>

      {/* 기본 정보 */}
      <table className="text-sm mb-6">
        <tbody>
          <tr>
            <td className="pr-6 py-0.5 font-semibold w-20">날짜</td>
            <td>{invoice.invoice_date}</td>
          </tr>
          <tr>
            <td className="pr-6 py-0.5 font-semibold">거래처</td>
            <td>{invoice.client?.name ?? '-'}</td>
          </tr>
          <tr>
            <td className="pr-6 py-0.5 font-semibold">거래명</td>
            <td>{invoice.title}</td>
          </tr>
        </tbody>
      </table>

      {/* 항목 테이블 */}
      <table className="w-full text-xs border-collapse mb-6">
        <thead>
          <tr className="border-y-2 border-black">
            <th className="px-2 py-2 text-center w-10 font-semibold">No.</th>
            <th className="px-2 py-2 text-center w-28 font-semibold">작업자</th>
            <th className="px-2 py-2 text-left font-semibold">상세내용</th>
            <th className="px-2 py-2 text-right w-28 font-semibold">공급가액</th>
            {mode === 'external' ? (
              <th className="px-2 py-2 text-right w-24 font-semibold">세 액</th>
            ) : (
              <>
                <th className="px-2 py-2 text-right w-28 font-semibold">작가 지급액</th>
                <th className="px-2 py-2 text-right w-24 font-semibold">귀속 금액</th>
                <th className="px-2 py-2 text-left w-32 font-semibold">비고</th>
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {displayItems.map((it, idx) => (
            <tr key={it.id ?? idx} className="border-b border-gray-300">
              <td className="px-2 py-1.5 text-center tabular-nums">{idx + 1}</td>
              <td className="px-2 py-1.5 text-center">
                {mode === 'external' ? '프리즘필터' : it.writer_names || '-'}
              </td>
              <td className="px-2 py-1.5">
                {it.description}
                {showNegotiatedNote && it.is_negotiated && (
                  <span className="block text-[10px] text-gray-500">
                    *기존 단가와 무관하게 협의 후 책정된 금액
                  </span>
                )}
              </td>
              <td className="px-2 py-1.5 text-right tabular-nums">
                {formatCurrency(it.supply_amount)}
              </td>
              {mode === 'external' ? (
                <td className="px-2 py-1.5 text-right tabular-nums">
                  {formatCurrency(calcLineTax(it.supply_amount))}
                </td>
              ) : (
                <>
                  <td className="px-2 py-1.5 text-right tabular-nums">
                    {formatCurrency(it.writer_pay)}
                  </td>
                  <td className="px-2 py-1.5 text-right tabular-nums">
                    {formatCurrency(calcAttribution(it.supply_amount, it.writer_pay))}
                  </td>
                  <td className="px-2 py-1.5 text-[10px] text-gray-600">{it.note ?? ''}</td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      {/* 합계 블록 */}
      {mode === 'external' ? (
        <div className="flex justify-end mb-8">
          <table className="text-sm">
            <tbody>
              <tr className="border-t-2 border-black">
                <td className="pr-8 py-1.5 font-semibold">총 공급가액</td>
                <td className="text-right tabular-nums w-32">{formatCurrency(totals.supplyTotal)}</td>
              </tr>
              <tr>
                <td className="pr-8 py-1.5 font-semibold">총 세액</td>
                <td className="text-right tabular-nums">{formatCurrency(totals.taxA)}</td>
              </tr>
              <tr className="border-t border-black">
                <td className="pr-8 py-1.5 font-bold">총 합계</td>
                <td className="text-right tabular-nums font-bold">{formatCurrency(totals.grandTotal)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      ) : (
        <div className="flex justify-end mb-8">
          <table className="text-sm">
            <tbody>
              <tr className="border-t-2 border-black">
                <td className="pr-8 py-1.5 font-semibold">총 공급가액 (A)</td>
                <td className="text-right tabular-nums w-32">{formatCurrency(totals.supplyTotal)}</td>
                <td className="pl-8 pr-4 text-gray-500 text-xs">세 액</td>
                <td className="text-right tabular-nums w-24"></td>
              </tr>
              <tr>
                <td className="pr-8 py-1.5 font-semibold">총 작가지급액 (B)</td>
                <td className="text-right tabular-nums">{formatCurrency(totals.writerPayTotal)}</td>
                <td></td>
                <td className="text-right tabular-nums text-gray-600">{formatCurrency(totals.taxB)}</td>
              </tr>
              <tr>
                <td className="pr-8 py-1.5 font-semibold">총 귀속금액 (C)</td>
                <td className="text-right tabular-nums">{formatCurrency(totals.attributionTotal)}</td>
                <td></td>
                <td className="text-right tabular-nums text-gray-600">{formatCurrency(totals.taxC)}</td>
              </tr>
              <tr className="border-t border-black">
                <td className="pr-8 py-1.5 font-bold">총 합계 (B+C)</td>
                <td className="text-right tabular-nums font-bold">{formatCurrency(totals.grandTotal)}</td>
                <td className="pl-8 pr-4 text-gray-500 text-[10px]">거래처 청구서 총 합계</td>
                <td className="text-right tabular-nums text-gray-600">{formatCurrency(totals.grandTotal)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* 검증 경고 (화면에서만, 인쇄 미포함) */}
      {!totals.isValid && (
        <div className="print:hidden mb-6 bg-amber-50 border border-amber-300 rounded-lg p-3 space-y-1">
          {totals.warnings.map((w, i) => (
            <p key={i} className="text-xs text-amber-700">⚠️ {w}</p>
          ))}
        </div>
      )}

      {/* 푸터: 회사 정보 */}
      <div className="border-t-2 border-black pt-4 flex justify-between text-xs">
        <div>
          <p className="font-semibold">{COMPANY.name}</p>
          <p className="text-gray-600">{COMPANY.address}</p>
        </div>
        <div className="text-right">
          <p>사업자등록번호 : {COMPANY.bizNumber}</p>
          <p>
            입금계좌 :{' '}
            {invoice.account
              ? `${invoice.account.bank_name} ${invoice.account.account_number}`
              : '-'}
          </p>
        </div>
      </div>
    </div>
  );
}
