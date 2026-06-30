import { describe, it, expect } from 'vitest';
import { formatPositions, formatPositionCodes, POSITION_OPTIONS, POSITION_LABELS } from './position';

describe('formatPositions', () => {
  it('빈 배열은 (미정)', () => {
    expect(formatPositions([])).toBe('(미정)');
  });
  it('단일 포지션은 라벨 1개', () => {
    expect(formatPositions(['프로듀서'])).toBe('프로듀서');
  });
  it('다중 포지션은 · 로 연결(옵션 순서 고정)', () => {
    expect(formatPositions(['작사가', '프로듀서'])).toBe('프로듀서 · 작사가');
  });
  it('알 수 없는 값은 무시', () => {
    expect(formatPositions(['프로듀서', 'X'])).toBe('프로듀서');
  });
});

describe('formatPositionCodes', () => {
  it('빈 배열은 (미정)', () => {
    expect(formatPositionCodes([])).toBe('(미정)');
  });
  it('단일은 1개', () => {
    expect(formatPositionCodes(['실연자'])).toBe('실연자');
  });
  it('다중은 옵션 순서대로 연결', () => {
    expect(formatPositionCodes(['실연자', '탑라이너'])).toBe('탑라이너 · 실연자');
  });
  it('알 수 없는 값은 무시', () => {
    expect(formatPositionCodes(['트랙메이커', 'X'])).toBe('트랙메이커');
  });
});

describe('상수', () => {
  it('옵션은 6개 역할', () => {
    expect(POSITION_OPTIONS).toEqual([
      '프로듀서',
      '트랙메이커',
      '탑라이너',
      '싱어송라이터',
      '작사가',
      '실연자',
    ]);
  });
  it('라벨 매핑(코드=라벨)', () => {
    expect(POSITION_LABELS).toEqual({
      프로듀서: '프로듀서',
      트랙메이커: '트랙메이커',
      탑라이너: '탑라이너',
      싱어송라이터: '싱어송라이터',
      작사가: '작사가',
      실연자: '실연자',
    });
  });
});
