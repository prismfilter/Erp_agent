// 용역 정산서 엑셀(.xlsx) 내보내기 — exceljs로 양식(병합·배경색·테두리·숫자포맷)을 재현.
// SheetJS(Community)는 셀 색/테두리/폰트를 지원하지 않아 정산서 꾸미기에 exceljs 사용.
// exceljs는 무거우므로 동적 import로 코드 스플리팅한다.

import { calculateSettlement } from '@/lib/settlement/calculator';
import { stripTitlePrefix } from '@/lib/invoice/calculator';
import type { ServiceSettlement } from '@/types/invoice';

const COMPANY = {
  name: '주식회사 프리즘필터뮤직그룹',
  bizNumber: '718-87-01509',
  address: '서울특별시 강남구 도산대로 26길 20, B2',
};

// 색상(ARGB)
const DARK = 'FF1E293B';   // slate-800
const HEADER = 'FF334155'; // slate-700
const WHITE = 'FFFFFFFF';
const MUTED = 'FF94A3B8';
const TEXT = 'FF334155';

// 얇은 회색 테두리 (셀 4면)
const THIN = { style: 'thin' as const, color: { argb: 'FFCBD5E1' } };
const BORDER = { top: THIN, left: THIN, bottom: THIN, right: THIN };

const solid = (argb: string) => ({ type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb } });

function fmtDate(s: string | null): string {
  return s ? s.slice(0, 10) : '-';
}
function sanitize(s: string): string {
  return s.replace(/[\\/:*?"<>|]/g, '_').trim();
}

export async function exportSettlementExcel(settlement: ServiceSettlement): Promise<void> {
  const ExcelJS = (await import('exceljs')).default;

  const detail = settlement.detail ?? [];
  const result = calculateSettlement(detail.map((d) => ({ amount: d.writer_pay, rate: 0 })));

  const wb = new ExcelJS.Workbook();
  wb.creator = 'PRISMFILTER MUSIC GROUP';
  wb.created = new Date();
  const ws = wb.addWorksheet('용역 정산서');

  ws.columns = [
    { width: 6 },   // A No.
    { width: 14 },  // B 입금일
    { width: 18 },  // C 거래처
    { width: 46 },  // D 작업 내용
    { width: 18 },  // E 작가 지급액
  ];

  // ── 제목 (A1:E1 병합) ──
  ws.mergeCells('A1:E1');
  const title = ws.getCell('A1');
  title.value = '용 역 정 산 서';
  title.font = { size: 18, bold: true, color: { argb: DARK } };
  title.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(1).height = 30;

  // ── 회사명 (A2:E2) ──
  ws.mergeCells('A2:E2');
  const sub = ws.getCell('A2');
  sub.value = COMPANY.name;
  sub.font = { size: 10, color: { argb: MUTED } };
  sub.alignment = { horizontal: 'center' };

  // ── 정산 정보 ──
  const info = (row: number, label: string, value: string, mergeVal = false) => {
    const l = ws.getCell(row, 1);
    l.value = label;
    l.font = { size: 10, color: { argb: MUTED } };
    if (mergeVal) ws.mergeCells(row, 2, row, 5);
    const v = ws.getCell(row, 2);
    v.value = value;
    v.font = { size: 10, bold: true, color: { argb: TEXT } };
  };
  info(4, '작가명', settlement.writer_name);
  info(5, '정산 기간', `${settlement.period_start} ~ ${settlement.period_end} (입금 완료일 기준)`, true);

  // ── 표 헤더 (행 7) ──
  const HROW = 7;
  const heads = ['No.', '입금일', '거래처', '작업 내용', '작가 지급액'];
  heads.forEach((h, i) => {
    const cell = ws.getCell(HROW, i + 1);
    cell.value = h;
    cell.font = { bold: true, color: { argb: WHITE } };
    cell.fill = solid(HEADER);
    cell.alignment = { horizontal: i === 3 ? 'left' : 'center', vertical: 'middle' };
    cell.border = BORDER;
  });
  ws.getRow(HROW).height = 22;

  // ── 항목 ──
  detail.forEach((d, idx) => {
    const r = HROW + 1 + idx;
    ws.getCell(r, 1).value = idx + 1;
    ws.getCell(r, 2).value = fmtDate(d.paid_at);
    ws.getCell(r, 3).value = d.client_name || '-';
    ws.getCell(r, 4).value = `${d.title} · ${stripTitlePrefix(d.description, d.title)}`;
    const amt = ws.getCell(r, 5);
    amt.value = d.writer_pay;
    amt.numFmt = '#,##0" 원"';
    for (let c = 1; c <= 5; c++) {
      const cell = ws.getCell(r, c);
      cell.border = BORDER;
      cell.font = { size: 10, color: { argb: TEXT } };
      cell.alignment = {
        horizontal: c === 4 ? 'left' : c === 5 ? 'right' : 'center',
        vertical: 'middle',
      };
    }
  });

  // ── 합계 블록 ──
  const SUM = HROW + 1 + detail.length + 1;
  const sumRows: [string, number, boolean][] = [
    ['총 작가지급액', result.totalAmount, false],
    ['소득세 (3%)', -result.incomeTax, false],
    ['지방소득세 (0.3%)', -result.localIncomeTax, false],
    ['실 수령액', result.netAmount, true],
  ];
  sumRows.forEach(([label, amount, emph], i) => {
    const r = SUM + i;
    ws.mergeCells(r, 1, r, 4);
    const l = ws.getCell(r, 1);
    l.value = label;
    l.alignment = { horizontal: 'right', vertical: 'middle' };
    const v = ws.getCell(r, 5);
    v.value = amount;
    v.numFmt = '#,##0" 원"';
    v.alignment = { horizontal: 'right', vertical: 'middle' };
    if (emph) {
      l.font = { bold: true, color: { argb: WHITE }, size: 12 };
      v.font = { bold: true, color: { argb: WHITE }, size: 12 };
      l.fill = solid(DARK);
      v.fill = solid(DARK);
      ws.getRow(r).height = 24;
    } else {
      l.font = { size: 10, color: { argb: TEXT } };
      v.font = { size: 10, color: { argb: TEXT } };
    }
    l.border = BORDER;
    v.border = BORDER;
  });

  // ── 푸터 ──
  const F = SUM + sumRows.length + 2;
  ws.mergeCells(F, 1, F, 5);
  const footer = ws.getCell(F, 1);
  footer.value = `${COMPANY.name}  ·  사업자등록번호 ${COMPANY.bizNumber}  ·  ${COMPANY.address}`;
  footer.font = { size: 9, color: { argb: MUTED } };
  footer.alignment = { horizontal: 'center' };

  // ── 다운로드 ──
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `PF_용역정산_${sanitize(settlement.writer_name)}_${settlement.period_start}_${settlement.period_end}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
