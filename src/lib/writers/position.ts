// 작가 포지션(역할) 코드·라벨·표시 헬퍼 (순수 함수)
// 프로듀서/트랙메이커/탑라이너/싱어송라이터/작사가/실연자, 다중 선택. 빈 배열 = 미정.
// 코드와 라벨이 동일(한글명을 그대로 값으로 저장).

export type PositionCode =
  | '프로듀서'
  | '트랙메이커'
  | '탑라이너'
  | '싱어송라이터'
  | '작사가'
  | '실연자';

export const POSITION_OPTIONS: readonly PositionCode[] = [
  '프로듀서',
  '트랙메이커',
  '탑라이너',
  '싱어송라이터',
  '작사가',
  '실연자',
];

export const POSITION_LABELS: Record<PositionCode, string> = {
  프로듀서: '프로듀서',
  트랙메이커: '트랙메이커',
  탑라이너: '탑라이너',
  싱어송라이터: '싱어송라이터',
  작사가: '작사가',
  실연자: '실연자',
};

// 표시 문자열: 빈 배열은 '(미정)', 그 외는 옵션 순서대로 라벨을 ' · '로 연결.
export function formatPositions(positions: string[]): string {
  const labels = POSITION_OPTIONS.filter((code) => positions.includes(code)).map(
    (code) => POSITION_LABELS[code]
  );
  return labels.length ? labels.join(' · ') : '(미정)';
}

// 선택값 표시 — 코드=라벨이므로 formatPositions와 동일(옵션 순서대로 ' · ' 연결).
export function formatPositionCodes(positions: string[]): string {
  const codes = POSITION_OPTIONS.filter((code) => positions.includes(code));
  return codes.length ? codes.join(' · ') : '(미정)';
}
