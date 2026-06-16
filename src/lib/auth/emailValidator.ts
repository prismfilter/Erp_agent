/**
 * 이메일 도메인 검증 (프리즘필터 비즈니스 이메일만 허용)
 */

export const ALLOWED_DOMAIN = 'prism-filter.com';

export function isValidPrismFilterEmail(email: string): boolean {
  if (!email) return false;

  const domain = email.split('@')[1]?.toLowerCase();
  return domain === ALLOWED_DOMAIN;
}

export function getEmailDomain(email: string): string {
  return email.split('@')[1] || '';
}

export function validatePrismFilterEmail(email: string): {
  valid: boolean;
  message: string;
} {
  if (!email) {
    return {
      valid: false,
      message: '이메일이 필요합니다.',
    };
  }

  if (!email.includes('@')) {
    return {
      valid: false,
      message: '유효한 이메일 형식이 아닙니다.',
    };
  }

  const domain = getEmailDomain(email);

  if (domain !== ALLOWED_DOMAIN) {
    return {
      valid: false,
      message: `@prism-filter.com 이메일만 허용됩니다. (현재: @${domain})`,
    };
  }

  return {
    valid: true,
    message: '이메일이 확인되었습니다.',
  };
}
