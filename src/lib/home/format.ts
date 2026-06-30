// 금액 축약 포맷 — 홈 피드 순위/도넛/달력 공용. 한글 단위 통일.
// 규칙:
// - 1천만원 미만: 콤마 포함 전체 숫자 노출 (예: 840,000원 / 1,435,000원 / 9,999,999원)
// - 1천만 이상 ~ 1억 미만: "X.X 천만원" (예: 11,000,000 → 1.1 천만원)
// - 1억 이상: "X.X 억원" (예: 184,932,500 → 1.8 억원)
export function formatCompactWon(won: number): string {
  const sign = won < 0 ? '-' : '';
  const abs = Math.abs(won);
  if (abs >= 100_000_000) return `${sign}${(abs / 100_000_000).toFixed(1)} 억원`;
  if (abs >= 10_000_000) return `${sign}${(abs / 10_000_000).toFixed(1)} 천만원`;
  if (abs === 0) return '0원';
  return `${sign}${abs.toLocaleString('ko-KR')}원`;
}
