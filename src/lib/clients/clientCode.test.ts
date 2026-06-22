import { describe, it, expect } from 'vitest';
import { parseClientCodeNumber, nextClientCode } from './clientCode';

describe('parseClientCodeNumber', () => {
  it('CL-007 → 7', () => expect(parseClientCodeNumber('CL-007')).toBe(7));
  it('CL-012 → 12', () => expect(parseClientCodeNumber('CL-012')).toBe(12));
  it('형식 불일치/빈값 → null', () => {
    expect(parseClientCodeNumber('X')).toBeNull();
    expect(parseClientCodeNumber(null)).toBeNull();
    expect(parseClientCodeNumber(undefined)).toBeNull();
  });
});

describe('nextClientCode', () => {
  it('빈 목록 → CL-001', () => expect(nextClientCode([])).toBe('CL-001'));
  it('최대+1', () => expect(nextClientCode(['CL-001', 'CL-003'])).toBe('CL-004'));
  it('번호 재사용 안 함(중간 공백 무시)', () => {
    expect(nextClientCode(['CL-001', 'CL-002', 'CL-005'])).toBe('CL-006');
  });
  it('CL 외 접두사 무시', () => {
    expect(nextClientCode(['EX-009', 'CL-002'])).toBe('CL-003');
  });
});
