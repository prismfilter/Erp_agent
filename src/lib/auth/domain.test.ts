import { describe, it, expect } from 'vitest';
import { isAllowedEmail } from './domain';

describe('isAllowedEmail (가입/접근 도메인 검증)', () => {
  it('회사 도메인(@prism-filter.com) 이메일을 허용한다', () => {
    expect(isAllowedEmail('kjs2576@prism-filter.com')).toBe(true);
    expect(isAllowedEmail('USER@PRISM-FILTER.COM')).toBe(true); // 대소문자 무시
    expect(isAllowedEmail('  user@prism-filter.com  ')).toBe(true); // 공백 트림
  });

  it('외부 도메인·스푸핑·빈 값을 차단한다', () => {
    expect(isAllowedEmail('attacker@gmail.com')).toBe(false);
    // 서브도메인 스푸핑 방지 (@ 앵커 + endsWith)
    expect(isAllowedEmail('user@prism-filter.com.evil.com')).toBe(false);
    expect(isAllowedEmail('user@evilprism-filter.com')).toBe(false);
    expect(isAllowedEmail(null)).toBe(false);
    expect(isAllowedEmail(undefined)).toBe(false);
    expect(isAllowedEmail('')).toBe(false);
    expect(isAllowedEmail('no-at-symbol')).toBe(false);
  });
});
