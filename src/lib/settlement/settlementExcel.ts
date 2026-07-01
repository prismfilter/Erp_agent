// 용역 정산서 엑셀(.xlsx) 내보내기 — PDF 미리보기와 유사한 디자인(로고·진한 헤더·테두리·합계 박스·푸터).
// 공용 모듈(excelDoc)을 사용해 청구서 엑셀과 디자인 통일. exceljs는 동적 import.

import { calculateSettlement, calcSettlementBreakdown } from '@/lib/settlement/calculator';
import { stripTitlePrefix, parseWorkContent } from '@/lib/invoice/calculator';
import type { ServiceSettlement } from '@/types/invoice';
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

// PDF 미리보기(SettlementPreview PER_PAGE)와 동일하게 표 아래를 채우는 최소 표시 행 수
const MIN_ROWS = 14;

function fmtDate(s: string | null): string {
  return s ? s.slice(0, 10) : '-';
}
function sanitize(s: string): string {
  return s.replace(/[\\/:*?"<>|]/g, '_').trim();
}

export async function exportSettlementExcel(settlement: ServiceSettlement): Promise<void> {
  const ExcelJS = (await import('exceljs')).default;
  const logo = await loadLogo();

  const detail = settlement.detail ?? [];
  const result = calculateSettlement(detail.map((d) => ({ amount: d.writer_pay, rate: 0 })));
  // 총액 세부내역용 합계 — 총 공급가액에서 회사 수수료·세금 차감
  const { totalSupply, companyFee } = calcSettlementBreakdown(detail);

  const wb = new ExcelJS.Workbook();
  wb.creator = 'PRISMFILTER MUSIC GROUP';
  wb.created = new Date();

  const ws = wb.addWorksheet('용역 정산서');
  setupSheet(ws);
  const cols = 6;
  // No.·입금일·거래처·작업내용·공급가액·작가지급액 — 금액 2열을 위해 폭 재분배
  [6, 13, 18, 40, 16, 16].forEach((w, i) => (ws.getColumn(i + 1).width = w));

  let r = drawHeader(wb, ws, logo, { title: '용 역 정 산 서', subtitle: 'SETTLEMENT', cols });
  r += 1;
  infoRow(ws, r, cols, '작가명', settlement.writer_name);
  infoRow(
    ws,
    r + 1,
    cols,
    '정산 기간',
    `${settlement.period_start} ~ ${settlement.period_end} (입금 완료일 기준)`
  );
  infoRow(ws, r + 2, cols, '건수', `${detail.length}건`);
  r += 4; // gap

  tableHead(ws, r, [
    { text: 'No.' },
    { text: '입금일' },
    { text: '거래처' },
    { text: '작업 내용', align: 'left' },
    { text: '공급가액', align: 'right' },
    { text: '작가 지급액', align: 'right' },
  ]);
  r += 1;
  detail.forEach((d, idx) => {
    // 작업 내용: 거래명 / [섹션] / 본문을 각 줄로 분리 (미리보기와 동일 형식)
    const { category, body } = parseWorkContent(stripTitlePrefix(d.description, d.title));
    const workContent = [d.title, ...(category ? [`[${category}]`] : []), body].join('\n');
    tableRow(ws, r, [
      { value: idx + 1 },
      { value: fmtDate(d.paid_at) },
      { value: d.client_name || '-' },
      { value: workContent, align: 'left' },
      { value: d.supply ?? 0, align: 'right', won: true },
      { value: d.writer_pay, align: 'right', won: true },
    ]);
    r += 1;
  });
  r += fillerRows(ws, r, Math.max(0, MIN_ROWS - detail.length), cols);
  r += 1; // gap

  totalRow(ws, r, cols, '총 공급가액', totalSupply);
  totalRow(ws, r + 1, cols, '회사 수수료', -companyFee);
  totalRow(ws, r + 2, cols, '소득세 (3%)', -result.incomeTax);
  totalRow(ws, r + 3, cols, '지방소득세 (0.3%)', -result.localIncomeTax);
  totalRow(ws, r + 4, cols, '실 수령액 (회사 수수료·원천징수 3.3% 공제)', result.netAmount, true);
  r += 6; // gap

  drawFooter(ws, r, cols, `발행일 : ${fmtDate(settlement.created_at)}`);

  await downloadWorkbook(
    wb,
    `PF_용역정산_${sanitize(settlement.writer_name)}_${settlement.period_start}_${settlement.period_end}.xlsx`
  );
}
