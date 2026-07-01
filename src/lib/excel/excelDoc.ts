// 청구서·정산서 엑셀(.xlsx) 공용 디자인 — PDF 미리보기와 유사하게(로고·진한 헤더·테두리·합계 박스·푸터).
// exceljs는 셀 색/폰트/테두리/이미지/병합을 지원. 무거우므로 호출측에서 동적 import 한다.

import type { Workbook, Worksheet, Borders } from 'exceljs';

export const COMPANY = {
  name: '주식회사 프리즘필터뮤직그룹',
  bizNumber: '718-87-01509',
  address: '서울특별시 강남구 도산대로 26길 20, B2',
};

// 색상(ARGB) — PDF 미리보기와 동일 톤
export const C = {
  ink: 'FF0F172A', // 본문(거의 검정)
  dark: 'FF1E293B', // 진한 헤더 배경 / 합계 강조 (slate-800)
  muted: 'FF64748B', // 연한 라벨
  light: 'FFF1F5F9', // 옅은 배경(정보/소계)
  indigo: 'FF4F46E5', // 강조(INVOICE/SETTLEMENT)
  white: 'FFFFFFFF',
  line: 'FFCBD5E1', // 테두리(slate-300)
};

export const FONT = '맑은 고딕'; // Korean Windows 기본 — 엑셀에서 보기 좋게
export const WON = '#,##0" 원"';

const thin = (argb = C.line) => ({ style: 'thin' as const, color: { argb } });
export const allBorder: Partial<Borders> = {
  top: thin(),
  left: thin(),
  bottom: thin(),
  right: thin(),
};
// 가로줄 전용 테두리 — PDF 미리보기처럼 행 하단 가로선만(세로 구분선 없음)
export const hLine: Partial<Borders> = { bottom: thin() };
// 표 헤더 하단 강조선(굵은 가로선)
const headUnderline: Partial<Borders> = {
  bottom: { style: 'medium' as const, color: { argb: C.ink } },
};
export const solid = (argb: string) =>
  ({ type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb } });

// 시트 기본 설정 — 눈금선 제거 + A4 인쇄 맞춤(스프레드시트가 아닌 디자인 문서처럼 보이게)
export function setupSheet(ws: Worksheet): void {
  ws.views = [{ showGridLines: false }];
  ws.pageSetup = {
    paperSize: 9, // A4
    orientation: 'portrait',
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0, footer: 0 },
  };
}

// public 로고를 ArrayBuffer로 — addImage(buffer)에 사용
export async function loadLogo(): Promise<ArrayBuffer | null> {
  try {
    const res = await fetch('/prismfilter-logo.png');
    if (!res.ok) return null;
    return await res.arrayBuffer();
  } catch {
    return null;
  }
}

// 문서 헤더(로고 + 브랜드 + 타이틀) — 1~4행 사용, 다음 콘텐츠 시작 행 반환
export function drawHeader(
  wb: Workbook,
  ws: Worksheet,
  logo: ArrayBuffer | null,
  opts: { title: string; subtitle: string; cols: number }
): number {
  const { title, subtitle, cols } = opts;
  ws.getRow(1).height = 30;
  ws.getRow(2).height = 16;
  ws.getRow(3).height = 12;
  ws.getRow(4).height = 6;

  const brand = ws.getCell(1, 3);
  brand.value = 'PRISMFILTER MUSIC GROUP';
  brand.font = { name: FONT, bold: true, size: 14, color: { argb: C.ink } };
  brand.alignment = { vertical: 'middle' };

  const company = ws.getCell(2, 3);
  company.value = COMPANY.name;
  company.font = { name: FONT, size: 10, color: { argb: C.muted } };

  const t = ws.getCell(1, cols);
  t.value = title;
  t.font = { name: FONT, bold: true, size: 22, color: { argb: C.ink } };
  t.alignment = { horizontal: 'right', vertical: 'middle' };

  const s = ws.getCell(2, cols);
  s.value = subtitle;
  s.font = { name: FONT, bold: true, size: 9, color: { argb: C.indigo } };
  s.alignment = { horizontal: 'right' };

  // 헤더 하단 구분선(굵게)
  for (let c = 1; c <= cols; c++) {
    ws.getCell(4, c).border = { bottom: { style: 'medium', color: { argb: C.ink } } };
  }

  if (logo) {
    const id = wb.addImage({ buffer: logo, extension: 'png' });
    ws.addImage(id, { tl: { col: 0.2, row: 0.15 }, ext: { width: 78, height: 78 } });
  }
  return 6;
}

// 정보 한 줄 (라벨 1~2열 병합 + 값 3~cols 병합)
export function infoRow(
  ws: Worksheet,
  row: number,
  cols: number,
  label: string,
  value: string
): void {
  ws.mergeCells(row, 1, row, 2);
  const l = ws.getCell(row, 1);
  l.value = label;
  l.font = { name: FONT, size: 10, color: { argb: C.muted } };
  l.alignment = { horizontal: 'left', vertical: 'middle' };

  ws.mergeCells(row, 3, row, cols);
  const v = ws.getCell(row, 3);
  v.value = value;
  v.font = { name: FONT, bold: true, size: 10, color: { argb: C.ink } };
  v.alignment = { horizontal: 'left', vertical: 'middle' };
  ws.getRow(row).height = 18;
}

export interface HeadCol {
  text: string;
  align?: 'left' | 'center' | 'right';
}

// 표 헤더 (진한 배경 + 흰 굵은 글씨 + 하단 강조 가로선) — 정렬은 전부 가운데
export function tableHead(ws: Worksheet, row: number, headers: HeadCol[]): void {
  headers.forEach((h, i) => {
    const cell = ws.getCell(row, i + 1);
    cell.value = h.text;
    cell.font = { name: FONT, bold: true, size: 10, color: { argb: C.white } };
    cell.fill = solid(C.dark);
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = headUnderline;
  });
  ws.getRow(row).height = 22;
}

export type CellAlign = 'left' | 'center' | 'right';

// 문자열 표시 폭 추정(한글·전각=2, 그 외=1) — 줄바꿈 줄 수 계산용
function displayWidth(s: string): number {
  let w = 0;
  for (const ch of s) {
    w += /[ᄀ-ᇿ⺀-꓏가-힣豈-﫿︰-｠￠-￦]/.test(ch) ? 2 : 1;
  }
  return w;
}

const ROW_LINE_PT = 15; // 줄바꿈 한 줄당 높이(pt) — 맑은고딕 size 10 기준 여유
const ROW_PAD_PT = 8;   // 셀 상하 여백(pt) — 글자가 위아래로 붙지 않게

// 표 데이터 한 행 (값 + 통화서식 + 하단 가로선)
// 디자인 확정: 금액 포함 모든 셀 가운데 정렬(작업 내용만 좌측). 문자열 셀은 줄바꿈 허용.
// 열 너비 대비 표시 폭으로 필요한 줄 수를 추정해 행 높이를 자동 산출 → 긴 텍스트가 잘리지 않게 한다.
export function tableRow(
  ws: Worksheet,
  row: number,
  cells: { value: string | number; align?: CellAlign; won?: boolean }[]
): void {
  let maxLines = 1;
  cells.forEach((c, i) => {
    const cell = ws.getCell(row, i + 1);
    cell.value = c.value;
    cell.font = { name: FONT, size: 10, color: { argb: C.ink } };
    const isText = typeof c.value === 'string';
    cell.alignment = { horizontal: c.align ?? 'center', vertical: 'middle', wrapText: isText };
    cell.border = hLine;
    if (c.won) cell.numFmt = WON;
    // 문자열 셀은 열 너비 대비 표시 폭으로 필요한 줄 수를 추정(숫자·금액은 줄바꿈 없음)
    // 명시적 줄바꿈(\n)은 각 조각을 개별 줄로 계산하고, 조각별 자동 줄바꿈도 합산한다.
    if (isText) {
      const colWidth = Number(ws.getColumn(i + 1).width) || 10;
      const capacity = Math.max(4, colWidth - 1); // 셀 여백 감안
      const lines = String(c.value)
        .split('\n')
        .reduce((sum, seg) => sum + Math.max(1, Math.ceil(displayWidth(seg) / capacity)), 0);
      if (lines > maxLines) maxLines = lines;
    }
  });
  ws.getRow(row).height = maxLines * ROW_LINE_PT + ROW_PAD_PT;
}

// 합계 한 줄 — PDF 미리보기처럼 우측 컴팩트 박스(라벨/값만 우측 2열에). emph면 진한 배경 흰 글씨.
export function totalRow(
  ws: Worksheet,
  row: number,
  cols: number,
  label: string,
  amount: number,
  emph = false
): void {
  // 좌측(1 ~ cols-2)은 비워 둠 — 눈금선이 꺼져 있어 자연스러운 여백이 된다
  if (cols > 2) ws.mergeCells(row, 1, row, cols - 2);
  const l = ws.getCell(row, cols - 1);
  l.value = label;
  l.alignment = { horizontal: 'right', vertical: 'middle' };
  const v = ws.getCell(row, cols);
  v.value = amount;
  v.numFmt = WON;
  v.alignment = { horizontal: 'right', vertical: 'middle' };
  if (emph) {
    l.font = { name: FONT, bold: true, size: 12, color: { argb: C.white } };
    v.font = { name: FONT, bold: true, size: 12, color: { argb: C.white } };
    l.fill = solid(C.dark);
    v.fill = solid(C.dark);
    ws.getRow(row).height = 26;
  } else {
    l.font = { name: FONT, size: 10, color: { argb: C.ink } };
    v.font = { name: FONT, size: 10, color: { argb: C.ink } };
    l.border = hLine;
    v.border = hLine;
    ws.getRow(row).height = 20;
  }
}

// 빈 채움 행 — PDF처럼 표 아래를 옅은 가로줄로 채워 한 장을 채운다. 추가한 행 수 반환.
export function fillerRows(ws: Worksheet, fromRow: number, count: number, cols: number): number {
  for (let k = 0; k < count; k++) {
    const r = fromRow + k;
    for (let c = 1; c <= cols; c++) {
      ws.getCell(r, c).border = hLine;
    }
    ws.getRow(r).height = 18;
  }
  return count;
}

// 푸터 (회사 정보) — row, row+1 사용
export function drawFooter(
  ws: Worksheet,
  row: number,
  cols: number,
  account: string
): void {
  for (let c = 1; c <= cols; c++) {
    ws.getCell(row, c).border = { top: { style: 'thin', color: { argb: C.line } } };
  }
  const r1 = ws.getCell(row, 1);
  r1.value = COMPANY.name;
  r1.font = { name: FONT, bold: true, size: 10, color: { argb: C.ink } };
  const right1 = ws.getCell(row, cols);
  right1.value = `사업자등록번호 : ${COMPANY.bizNumber}`;
  right1.font = { name: FONT, size: 9, color: { argb: C.muted } };
  right1.alignment = { horizontal: 'right' };

  const r2 = ws.getCell(row + 1, 1);
  r2.value = COMPANY.address;
  r2.font = { name: FONT, size: 9, color: { argb: C.muted } };
  const right2 = ws.getCell(row + 1, cols);
  right2.value = account;
  right2.font = { name: FONT, size: 9, color: { argb: C.muted } };
  right2.alignment = { horizontal: 'right' };
  ws.getRow(row).height = 18;
}

// 워크북 다운로드 (Blob)
export async function downloadWorkbook(wb: Workbook, filename: string): Promise<void> {
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
