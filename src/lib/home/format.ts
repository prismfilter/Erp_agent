// 금액 축약 포맷 — 홈 피드 히어로/도넛/달력 공용. 억/백만(M)/원 3단계.
export function formatCompactWon(won: number): string {
  const sign = won < 0 ? '-' : '';
  const abs = Math.abs(won);
  if (abs >= 100_000_000) return `${sign}${(abs / 100_000_000).toFixed(1)}억`;
  if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(1)}M`;
  if (abs === 0) return '0원';
  return `${sign}${abs.toLocaleString('ko-KR')}원`;
}
