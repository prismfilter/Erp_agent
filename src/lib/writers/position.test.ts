import { describe, it, expect } from 'vitest';
import { formatPositions, formatPositionCodes, POSITION_OPTIONS, POSITION_LABELS } from './position';

describe('formatPositions', () => {
  it('빈 배열은 (미정)', () => {
    expect(formatPositions([])).toBe('(미정)');
  });
  it('단일 포지션은 라벨 1개', () => {
    expect(formatPositions(['A'])).toBe('작사');
  });
  it('다중 포지션은 · 로 연결(옵션 순서 고정 A·C·AR)', () => {
    expect(formatPositions(['AR', 'A'])).toBe('작사 · 편곡');
  });
  it('알 수 없는 값은 무시', () => {
    expect(formatPositions(['A', 'X'])).toBe('작사');
  });
});

describe('formatPositionCodes', () => {
  it('빈 배열은 (미정)', () => {
    expect(formatPositionCodes([])).toBe('(미정)');
  });
  it('단일은 코드 1개', () => {
    expect(formatPositionCodes(['A'])).toBe('A');
  });
  it('다중은 옵션 순서대로 코드 연결', () => {
    expect(formatPositionCodes(['AR', 'A'])).toBe('A · AR');
  });
  it('알 수 없는 값은 무시', () => {
    expect(formatPositionCodes(['C', 'X'])).toBe('C');
  });
});

describe('상수', () => {
  it('옵션은 A/C/AR', () => {
    expect(POSITION_OPTIONS).toEqual(['A', 'C', 'AR']);
  });
  it('라벨 매핑', () => {
    expect(POSITION_LABELS).toEqual({ A: '작사', C: '작곡', AR: '편곡' });
  });
});
