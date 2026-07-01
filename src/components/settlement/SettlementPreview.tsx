'use client';

// 용역 정산서 미리보기 — 내부 지급서(InvoicePreview)와 동일한 A4 디자인.
// 항목이 많으면 PAGE 단위로 분할하고, 최종 합계는 마지막 페이지에만 표시한다.

import { useMemo } from 'react';
import type { ServiceSettlement } from '@/types/invoice';
import { stripTitlePrefix, parseWorkContent } from '@/lib/invoice/calculator';
import { calculateSettlement, calcSettlementBreakdown, formatWon } from '@/lib/settlement/calculator';

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

export function SettlementPreview({
  settlement,
  docNumber,
}: {
  settlement: ServiceSettlement;
  docNumber?: string;
}) {
  const detail = useMemo(() => settlement.detail ?? [], [settlement.detail]);

  // 세금 계산 (작가지급액 합 기준, 수수료 없음 — 원천징수만)
  const result = useMemo(
    () => calculateSettlement(detail.map((d) => ({ amount: d.writer_pay, rate: 0 }))),
    [detail]
  );

  // 총액 세부내역용 합계 — 총 공급가액에서 회사 수수료·세금을 차감해 실 수령액으로 흐른다
  const { totalSupply, companyFee } = useMemo(() => calcSettlementBreakdown(detail), [detail]);

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
        const emptyCount = Math.max(0, (isLast ? PER_PAGE - 5 : PER_PAGE) - pageItems.length);

        return (
          <div
            key={pageIdx}
            className="settlement-page relative mx-auto w-full max-w-[794px] min-h-[1123px] bg-white text-black border border-gray-200 shadow-lg p-12 flex flex-col print:max-w-none print:shadow-none print:border-0"
          >
            {/* 문서번호 — A4 좌측 상단 모서리.
                물리 프린터는 종이 가장자리 ~5~6mm를 인쇄 못 하므로(unprintable margin),
                인쇄 시에만 top 7mm·left 4.7mm로 살짝 내리고 우측으로 옮겨 상/좌 잘림 방지. 미리보기는 그대로. */}
            {docNumber && (
              <p className="absolute top-3 left-4 text-[10px] text-slate-400 print:top-[7mm] print:left-[4.7mm]">문서번호 {docNumber}</p>
            )}

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
                <span className="mr-2 text-slate-500 font-medium flex-shrink-0">작가명:</span>
                <span className="font-semibold text-slate-900">{settlement.writer_name}</span>
              </div>
              <div className="flex">
                <span className="mr-2 text-slate-500 font-medium flex-shrink-0">건수:</span>
                <span className="font-semibold text-slate-900">{detail.length}건</span>
              </div>
              <div className="flex col-span-2">
                <span className="mr-2 text-slate-500 font-medium flex-shrink-0">정산 기간:</span>
                <span className="font-semibold text-slate-900">
                  {settlement.period_start} ~ {settlement.period_end} <span className="text-slate-500">(입금 완료일 기준)</span>
                </span>
              </div>
            </div>

            {/* ===== 항목 테이블 ===== */}
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-slate-800 text-white">
                  <th className="px-2 py-2.5 text-center w-8 font-bold first:rounded-tl-md">No.</th>
                  <th className="px-2 py-2.5 text-center w-[74px] font-bold whitespace-nowrap">입금일</th>
                  <th className="px-2 py-2.5 text-center font-bold whitespace-nowrap">거래처</th>
                  <th className="px-2 py-2.5 text-center font-bold">작업 내용</th>
                  <th className="px-2 py-2.5 text-center w-[92px] font-bold whitespace-nowrap">공급가액</th>
                  <th className="px-2 py-2.5 text-center w-[92px] font-bold last:rounded-tr-md whitespace-nowrap">작가 지급액</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((d, idx) => (
                  <tr key={`${pageIdx}-${idx}`} className="border-b border-gray-300">
                    <td className="px-2 py-2 text-center tabular-nums text-slate-600">{startNo + idx + 1}</td>
                    <td className="px-2 py-2 text-center text-[11px] text-slate-600 whitespace-nowrap">{fmtDate(d.paid_at)}</td>
                    <td className="px-2 py-2 text-center text-slate-900 whitespace-nowrap">{d.client_name || '-'}</td>
                    <td className="px-2 py-2 text-center text-slate-900 break-keep">
                      {(() => {
                        // 거래명 / [섹션] / 본문을 각각 독립된 줄로 분리 —
                        // 한 줄에 붙여 두면 본문이 어중간하게 잘려 줄바꿈되므로 3단으로 나눈다.
                        const { category, body } = parseWorkContent(stripTitlePrefix(d.description, d.title));
                        return (
                          <>
                            <span className="block text-slate-500">{d.title}</span>
                            {category && <span className="block text-slate-500">[{category}]</span>}
                            <span className="block break-keep">{body}</span>
                          </>
                        );
                      })()}
                    </td>
                    <td className="px-2 py-2 text-center text-[11px] tabular-nums text-slate-700 whitespace-nowrap">
                      {formatWon(d.supply ?? 0)}
                    </td>
                    <td className="px-2 py-2 text-center text-[11px] tabular-nums font-medium text-slate-900 whitespace-nowrap">
                      {formatWon(d.writer_pay)}
                    </td>
                  </tr>
                ))}
                {/* 빈 행 — A4 채우기 */}
                {Array.from({ length: emptyCount }).map((_, i) => (
                  <tr key={`empty-${pageIdx}-${i}`} className="border-b border-gray-200 h-8">
                    {Array.from({ length: 6 }).map((__, c) => (
                      <td key={c} className="px-2 py-2">&nbsp;</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>

            {/* ===== 합계 (마지막 페이지에만) — 하단 푸터 구분선 근처로 밀어 배치 ===== */}
            {isLast && (
              <div className="flex justify-end mt-auto">
                <div className="w-80">
                  <div className="flex justify-between py-1.5 text-sm font-bold text-slate-900">
                    <span>총 공급가액</span>
                    <span className="tabular-nums">{formatWon(totalSupply)}</span>
                  </div>
                  <div className="flex justify-between py-1.5 text-xs text-slate-600">
                    <span>회사 수수료</span>
                    <span className="tabular-nums">- {formatWon(companyFee)}</span>
                  </div>
                  <div className="flex justify-between py-1.5 text-xs text-slate-600">
                    <span>소득세 (3%)</span>
                    <span className="tabular-nums">- {formatWon(result.incomeTax)}</span>
                  </div>
                  <div className="flex justify-between py-1.5 text-xs text-slate-600 border-b border-gray-300">
                    <span>지방소득세 (0.3%)</span>
                    <span className="tabular-nums">- {formatWon(result.localIncomeTax)}</span>
                  </div>
                  <div className="flex justify-between py-2.5 mt-1 px-3 bg-slate-800 text-white rounded-md">
                    <span className="font-bold text-sm">실 수령액</span>
                    <span className="font-bold text-sm tabular-nums">{formatWon(result.netAmount)}</span>
                  </div>
                  <p className="text-right text-[10px] text-slate-500 mt-1">회사 수수료 및 원천징수 3.3% 공제 후 지급액</p>
                </div>
              </div>
            )}

            {/* ===== 푸터 — 마지막 페이지는 합계 바로 아래, 그 외 페이지는 맨 밑 ===== */}
            <div className={`pt-8 ${isLast ? '' : 'mt-auto'}`}>
              <div className="flex justify-between items-end text-[11px] border-t border-gray-300 pt-4">
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
