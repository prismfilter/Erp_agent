// 작가 포지션(저작물 역할) 코드·라벨·표시 헬퍼 (순수 함수)
// A(작사)/C(작곡)/AR(편곡), 다중 선택. 빈 배열 = 미정.

export type PositionCode = 'A' | 'C' | 'AR';

export const POSITION_OPTIONS: readonly PositionCode[] = ['A', 'C', 'AR'];

export const POSITION_LABELS: Record<PositionCode, string> = {
  A: '작사',
  C: '작곡',
  AR: '편곡',
};

// 표시 문자열: 빈 배열은 '(미정)', 그 외는 옵션 순서(A·C·AR)대로 라벨을 ' · '로 연결.
export function formatPositions(positions: string[]): string {
  const labels = POSITION_OPTIONS.filter((code) => positions.includes(code)).map(
    (code) => POSITION_LABELS[code]
  );
  return labels.length ? labels.join(' · ') : '(미정)';
}

// 코드 표시: 빈 배열은 '(미정)', 그 외는 옵션 순서(A·C·AR)대로 영어 코드를 ' · '로 연결.
// 선택값 표시는 한글 라벨이 아닌 코드(A/C/AR)로 노출한다.
export function formatPositionCodes(positions: string[]): string {
  const codes = POSITION_OPTIONS.filter((code) => positions.includes(code));
  return codes.length ? codes.join(' · ') : '(미정)';
}
