// 접근 허용 이메일 도메인 검증 — Edge(middleware)·Node(API/콜백) 양쪽에서 import 가능하도록
// next/headers 등 서버 전용 모듈에 의존하지 않는 순수 함수로 둔다.
//
// 회사 내부용: @prism-filter.com 계정만 허용(요구사항). 환경변수로 재정의 가능.

export const ALLOWED_EMAIL_DOMAIN = process.env.ALLOWED_EMAIL_DOMAIN ?? 'prism-filter.com';

// 이메일이 허용 도메인에 속하는지 (대소문자 무시)
export function isAllowedEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return email.trim().toLowerCase().endsWith(`@${ALLOWED_EMAIL_DOMAIN.toLowerCase()}`);
}
