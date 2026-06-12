// 청구서 엑셀(.xlsx) 내보내기 — 시트 2개 (거래처 청구서 / 내부 지급서)
// 실제 엑셀 양식과 동일한 레이아웃, 합계는 SUM 수식 (하드코딩 금지)

import * as XLSX from 'xlsx';
import type { Invoice } from '@/types/invoice';
import {
  getExternalItems,
  getInternalItems,
  calcItemBreakdown,
  buildExportFilename,
} from './calculator';

const COMPANY = {
  name: '주식회사 프리즘필터뮤직그룹',
  bizNumber: '사업자등록번호 : 718-87-01509',
  address: '서울특별시 강남구 도산대로 26길 20, B2',
};

// AOA(array of arrays) 셀 헬퍼
type Cell = string | number | { f: string } | null;

export function exportInvoiceExcel(invoice: Invoice): void {
  const wb = XLSX.utils.book_new();
  wb.SheetNames = [];

  const accountLabel = invoice.account
    ? `입금계좌 : ${invoice.account.bank_name} ${invoice.account.account_number}`
    : '입금계좌 : -';

  // ── 시트 1: 거래처 청구서 (외부용 — 작업자 "프리즘필터" 고정) ──
  const external = getExternalItems(invoice.items ?? []);
  const extRows: Cell[][] = [
    [],
    [],
    ['청  구  서'],
    [COMPANY.name],
    [],
    ['날짜', null, invoice.invoice_date],
    ['거래처', null, invoice.client?.name ?? ''],
    ['거래명', null, invoice.title],
    [],
    ['No.', '작업자', '상세내용', '공급가액', '세 액'],
  ];

  const extStart = extRows.length + 1; // 1-based 데이터 시작 행
  external.forEach((it, idx) => {
    const rowNum = extStart + idx;
    extRows.push([
      idx + 1,
      '프리즘필터',
      it.description + (it.is_negotiated ? ' *기존 단가와 무관하게 협의 후 책정된 금액' : ''),
      calcItemBreakdown(it).netSupply, // 공급가액 = 할인 반영된 순매출
      { f: `D${rowNum}*0.1` },
    ]);
  });
  const extEnd = extStart + external.length - 1;

  extRows.push([]);
  const extTotalRow = extRows.length + 1;
  extRows.push([null, null, '총 공급가액', { f: `SUM(D${extStart}:D${extEnd})` }]);
  extRows.push([null, null, '총 세액', { f: `SUM(E${extStart}:E${extEnd})` }]);
  extRows.push([null, null, '총 합계', { f: `D${extTotalRow}+D${extTotalRow + 1}` }]);
  extRows.push([]);
  extRows.push([COMPANY.name, null, null, null, COMPANY.bizNumber]);
  extRows.push([COMPANY.address, null, null, null, accountLabel]);

  const wsExt = XLSX.utils.aoa_to_sheet(extRows);
  wsExt['!cols'] = [{ wch: 5 }, { wch: 12 }, { wch: 60 }, { wch: 14 }, { wch: 26 }];
  XLSX.utils.book_append_sheet(wb, wsExt, '거래처 청구서');

  // ── 시트 2: 내부 지급서 (실명 + 작가지급액 + 귀속금액 + 비고) ──
  const internal = getInternalItems(invoice.items ?? []);
  const intRows: Cell[][] = [
    [],
    [],
    ['청  구  서'],
    [COMPANY.name],
    [],
    ['날짜', null, invoice.invoice_date],
    ['거래처', null, invoice.client?.name ?? ''],
    ['거래명', null, invoice.title],
    [],
    ['No.', '작업자', '상세내용', '공급가액', '할인', '작가 지급액', '귀속 금액'],
  ];

  // 컬럼: D=공급가액(할인 전), E=할인, F=작가지급액, G=귀속금액
  const intStart = intRows.length + 1;
  internal.forEach((it, idx) => {
    const rowNum = intStart + idx;
    intRows.push([
      idx + 1,
      it.writer_names,
      it.description,
      it.supply_amount,                              // D 공급가액(할인 전)
      it.discount_amount,                            // E 할인
      calcItemBreakdown(it).writerPay,               // F 작가지급액
      { f: `(D${rowNum}-E${rowNum})-F${rowNum}` },    // G 귀속금액 = (공급−할인)−작가지급
    ]);
  });
  const intEnd = intStart + internal.length - 1;

  intRows.push([]);
  const aRow = intRows.length + 1; // 총 순매출(A) 행
  intRows.push([null, null, '총 공급가액 (A=공급−할인)', { f: `SUM(D${intStart}:D${intEnd})-SUM(E${intStart}:E${intEnd})` }]);
  intRows.push([null, null, '총 작가지급액 (B)', { f: `SUM(F${intStart}:F${intEnd})` }]);
  intRows.push([null, null, '총 귀속금액 (C)', { f: `SUM(G${intStart}:G${intEnd})` }]);
  intRows.push([null, null, '총 합계 (A + 세액)', { f: `D${aRow}*1.1` }, null, null, '거래처 청구서 총 합계와 일치']);
  intRows.push([]);
  intRows.push([COMPANY.name, null, null, null, null, COMPANY.bizNumber]);
  intRows.push([COMPANY.address, null, null, null, null, accountLabel]);

  const wsInt = XLSX.utils.aoa_to_sheet(intRows);
  wsInt['!cols'] = [{ wch: 5 }, { wch: 14 }, { wch: 50 }, { wch: 14 }, { wch: 12 }, { wch: 14 }, { wch: 14 }];
  XLSX.utils.book_append_sheet(wb, wsInt, '내부 지급서');

  // 다운로드
  const filename = buildExportFilename(
    invoice.client?.name ?? '거래처',
    invoice.title,
    invoice.invoice_date
  );
  XLSX.writeFile(wb, `${filename}.xlsx`);
}
