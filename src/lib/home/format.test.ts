import { describe, it, expect } from 'vitest';
import { formatCompactWon } from './format';

describe('formatCompactWon', () => {
  it('1억 이상은 억 단위 소수1', () => {
    expect(formatCompactWon(184_932_500)).toBe('1.8억');
  });
  it('백만~1억 미만은 M(백만)', () => {
    expect(formatCompactWon(13_200_000)).toBe('13.2M');
    expect(formatCompactWon(49_900_000)).toBe('49.9M');
  });
  it('백만 미만은 천 단위 콤마 원', () => {
    expect(formatCompactWon(840_000)).toBe('840,000원');
  });
  it('음수 부호 유지', () => {
    expect(formatCompactWon(-2_400_000)).toBe('-2.4M');
  });
  it('0', () => {
    expect(formatCompactWon(0)).toBe('0원');
  });
});
