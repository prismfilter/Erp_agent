// API 응답 공용 헬퍼 — 표준 에러 응답 + DB 에러의 안전한 변환.
// 목적(보안): Supabase/Postgres의 raw error.message(테이블·컬럼·제약명 등 내부 스키마 정보)가
// 클라이언트로 유출되지 않도록, 상세 원인은 서버 로그에만 남기고 클라이언트엔 일반 메시지만 반환한다.

import { NextResponse } from 'next/server';
import { logger } from '@/lib/utils/logger';

// 표준 에러 응답 (의도된 사용자 메시지를 그대로 전달)
export function fail(status: number, message: string): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

// 예기치 못한 서버 오류 — 상세(err)는 서버 로그로만, 클라이언트엔 일반 메시지.
export function serverError(context: string, err: unknown): NextResponse {
  logger.error(`${context}:`, err);
  return fail(500, '서버 오류가 발생했습니다.');
}

// DB 처리 오류 폴백 — 라우트가 23505/23503 등 '알려진 코드'를 자체 분기로 친화 메시지 처리한 뒤,
// 그 외(예상 밖) 케이스에서 호출한다. error.message를 노출하지 않고 일반 메시지만 반환한다.
export function dbError(context: string, error: unknown): NextResponse {
  logger.error(`${context}:`, error);
  return fail(500, '데이터 처리 중 오류가 발생했습니다.');
}
