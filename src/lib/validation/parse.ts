// API 본문 검증 공용 헬퍼 — safeParse 결과를 라우트에서 일관되게 처리한다.

import { NextResponse } from 'next/server';
import type { ZodType } from 'zod';

type ParseResult<T> =
  | { success: true; data: T }
  | { success: false; response: NextResponse };

// 스키마로 본문을 검증. 실패 시 첫 이슈 메시지를 담은 400 응답을 반환한다.
export function parseBody<T>(schema: ZodType<T>, body: unknown): ParseResult<T> {
  const result = schema.safeParse(body);
  if (result.success) {
    return { success: true, data: result.data };
  }
  const first = result.error.issues[0];
  const message = first
    ? first.path.length > 0
      ? `${first.path.join('.')}: ${first.message}`
      : first.message
    : '입력값이 올바르지 않습니다.';
  return {
    success: false,
    response: NextResponse.json({ error: message }, { status: 400 }),
  };
}
