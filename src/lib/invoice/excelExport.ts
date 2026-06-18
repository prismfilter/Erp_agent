// 청구서 엑셀(.xlsx) 내보내기 — 거래처 청구서 / 내부 지급서 2시트.
// PDF 미리보기와 유사한 디자인(로고·진한 헤더·테두리·합계 박스·푸터). exceljs는 동적 import.

import type { Worksheet } from 'exceljs';
import type { Invoice } from '@/types/invoice';
import {
  calcInvoiceTotals,
  calcLineTax,
  calcItemBreakdown,
  getExternalItems,
  getInternalItems,
  stripTitlePrefix,
  buildExportFilename,
} from './calculator';
import {
  loadLogo,
  setupSheet,
  drawHeader,
  infoRow,
  tableHead,
  tableRow,
  totalRow,
  fillerRows,
  drawFooter,
  downloadWorkbook,
} from '@/lib/excel/excelDoc';

// PDF 미리보기와 동일하게 표 아래를 채우는 최소 표시 행 수
const MIN_ROWS = 12;

function setWidths(ws: Worksheet, widths: number[]): void {
  widths.forEach((w, i) => {
    ws.getColumn(i + 1).width = w;
  });
}

export async function exportInvoiceExcel(invoice: Invoice): Promise<void> {
  const ExcelJS = (await import('exceljs')).default;
  const logo = await loadLogo();

  const items = invoice.items ?? [];
  const totals = calcInvoiceTotals(items);
  const accountLabel = invoice.account
    ? `입금계좌 : ${invoice.account.bank_name} ${invoice.account.account_number}`
    : '입금계좌 : -';
  const client = invoice.client?.name ?? '-';

  const wb = new ExcelJS.Workbook();
  wb.creator = 'PRISMFILTER MUSIC GROUP';
  wb.created = new Date();

  // 공통 정보 4줄
  const writeInfo = (ws: Worksheet, cols: number, startRow: number): number => {
    infoRow(ws, startRow, cols, '거래처', client);
    infoRow(ws, startRow + 1, cols, '청구일', invoice.invoice_date);
    infoRow(ws, startRow + 2, cols, '거래명', invoice.title);
    infoRow(ws, startRow + 3, cols, '입금계좌', accountLabel.replace('입금계좌 : ', ''));
    return startRow + 4;
  };

  // ── 시트 1: 거래처 청구서 (외부용) — 5열 ──
  {
    const ws = wb.addWorksheet('거래처 청구서');
    setupSheet(ws);
    const cols = 5;
    setWidths(ws, [6, 16, 50, 18, 18]);
    let r = drawHeader(wb, ws, logo, { title: '청 구 서', subtitle: 'INVOICE', cols });
    r += 1; // gap
    r = writeInfo(ws, cols, r);
    r += 1; // gap
    tableHead(ws, r, [
      { text: 'No.' },
      { text: '작업자' },
      { text: '상세내용', align: 'left' },
      { text: '공급가액', align: 'right' },
      { text: '세 액', align: 'right' },
    ]);
    r += 1;
    const externalItems = getExternalItems(items);
    externalItems.forEach((it, idx) => {
      const bd = calcItemBreakdown(it);
      const desc =
        stripTitlePrefix(it.description, invoice.title) +
        (it.is_negotiated ? ' *기존 단가와 무관하게 협의 후 책정된 금액' : '');
      tableRow(ws, r, [
        { value: idx + 1 },
        { value: it.writer_names || '-' },
        { value: desc, align: 'left' },
        { value: bd.netSupply, align: 'right', won: true },
        { value: calcLineTax(bd.netSupply), align: 'right', won: true },
      ]);
      r += 1;
    });
    r += fillerRows(ws, r, Math.max(0, MIN_ROWS - externalItems.length), cols);
    r += 1; // gap
    totalRow(ws, r, cols, '총 공급가액', totals.supplyTotal);
    totalRow(ws, r + 1, cols, '총 세액', totals.taxA);
    totalRow(ws, r + 2, cols, '총 합계', totals.grandTotal, true);
    r += 4; // gap
    drawFooter(ws, r, cols, accountLabel);
  }

  // ── 시트 2: 내부 지급서 (내부용) — 7열 ──
  {
    const ws = wb.addWorksheet('내부 지급서');
    setupSheet(ws);
    const cols = 7;
    setWidths(ws, [6, 14, 40, 15, 13, 15, 15]);
    let r = drawHeader(wb, ws, logo, { title: '내부 지급서', subtitle: 'INTERNAL', cols });
    r += 1;
    r = writeInfo(ws, cols, r);
    r += 1;
    tableHead(ws, r, [
      { text: 'No.' },
      { text: '작업자' },
      { text: '상세내용', align: 'left' },
      { text: '공급가액', align: 'right' },
      { text: '할인', align: 'right' },
      { text: '작가 지급액', align: 'right' },
      { text: '귀속 금액', align: 'right' },
    ]);
    r += 1;
    const internalItems = getInternalItems(items);
    internalItems.forEach((it, idx) => {
      const bd = calcItemBreakdown(it);
      tableRow(ws, r, [
        { value: idx + 1 },
        { value: it.writer_names || '-' },
        { value: stripTitlePrefix(it.description, invoice.title), align: 'left' },
        { value: it.supply_amount, align: 'right', won: true },
        { value: it.discount_amount, align: 'right', won: true },
        { value: bd.writerPay, align: 'right', won: true },
        { value: bd.attribution, align: 'right', won: true },
      ]);
      r += 1;
    });
    r += fillerRows(ws, r, Math.max(0, MIN_ROWS - internalItems.length), cols);
    r += 1;
    totalRow(ws, r, cols, '총 공급가액 (A)', totals.supplyTotal);
    totalRow(ws, r + 1, cols, '총 작가지급액 (B)', totals.writerPayTotal);
    totalRow(ws, r + 2, cols, '총 귀속금액 (C)', totals.attributionTotal);
    totalRow(ws, r + 3, cols, '총 합계 (B+C)', totals.grandTotal, true);
    r += 5;
    drawFooter(ws, r, cols, accountLabel);
  }

  const filename = buildExportFilename(client, invoice.title, invoice.invoice_date);
  await downloadWorkbook(wb, `${filename}.xlsx`);
}
