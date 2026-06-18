import { describe, it, expect } from 'vitest';
import { codePrefix, parseCodeNumber, nextWriterCode, needsRecode } from './writerCode';

describe('codePrefix', () => {
  it('전속작가 → EX', () => expect(codePrefix('전속작가')).toBe('EX'));
  it('일반작가 → GN', () => expect(codePrefix('일반작가')).toBe('GN'));
  it('알 수 없는 구분 → null', () => expect(codePrefix('작곡가')).toBeNull());
});

describe('parseCodeNumber', () => {
  it('EX-007 → 7', () => expect(parseCodeNumber('EX-007')).toBe(7));
  it('GN-012 → 12', () => expect(parseCodeNumber('GN-012')).toBe(12));
  it('형식 불일치/빈값 → null', () => {
    expect(parseCodeNumber('X')).toBeNull();
    expect(parseCodeNumber(null)).toBeNull();
    expect(parseCodeNumber(undefined)).toBeNull();
  });
});

describe('nextWriterCode', () => {
  it('빈 목록 → 001', () => expect(nextWriterCode([], '전속작가')).toBe('EX-001'));
  it('해당 prefix 최대+1, 다른 prefix 무시', () => {
    expect(nextWriterCode(['EX-001', 'EX-003', 'GN-009'], '전속작가')).toBe('EX-004');
    expect(nextWriterCode(['EX-001', 'GN-002'], '일반작가')).toBe('GN-003');
  });
  it('번호 재사용 안 함(중간 공백 무시)', () => {
    expect(nextWriterCode(['EX-001', 'EX-002', 'EX-005'], '전속작가')).toBe('EX-006');
  });
  it('알 수 없는 구분 → 예외', () => {
    expect(() => nextWriterCode([], '작곡가')).toThrow();
  });
});

describe('needsRecode', () => {
  it('GN→전속: 재배정 필요', () => expect(needsRecode('GN-001', '전속작가')).toBe(true));
  it('EX→전속(동일 prefix): 불필요', () => expect(needsRecode('EX-001', '전속작가')).toBe(false));
  it('코드 없음 → 부여 필요', () => expect(needsRecode(null, '일반작가')).toBe(true));
});
