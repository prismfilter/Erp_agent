import { describe, it, expect } from 'vitest';
import { formatCompactWon } from './format';

describe('formatCompactWon', () => {
  it('1억 이상은 억원 단위 소수1', () => {
    expect(formatCompactWon(184_932_500)).toBe('1.8 억원');
  });
  it('1천만~1억 미만은 천만원 단위', () => {
    expect(formatCompactWon(11_000_000)).toBe('1.1 천만원');
    expect(formatCompactWon(13_200_000)).toBe('1.3 천만원');
    expect(formatCompactWon(22_000_000)).toBe('2.2 천만원');
  });
  it('1천만 미만은 콤마 포함 전체 숫자 노출', () => {
    expect(formatCompactWon(840_000)).toBe('840,000원');
    expect(formatCompactWon(1_435_000)).toBe('1,435,000원');
    expect(formatCompactWon(9_999_999)).toBe('9,999,999원');
  });
  it('음수 부호 유지', () => {
    expect(formatCompactWon(-2_400_000)).toBe('-2,400,000원');
  });
  it('0', () => {
    expect(formatCompactWon(0)).toBe('0원');
  });
});
