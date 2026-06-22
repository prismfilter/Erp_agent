// 거래처 코드 생성 순수 로직 — CL-NNN. DB·DOM 비의존 → vitest(node) 단위테스트.
// API(POST)와 등록 폼 미리보기가 공용 사용. 작가 코드(writerCode.ts) 동일 패턴(단일 접두사).

const PREFIX = 'CL';

// 'CL-007' → 7. 형식이 다르거나 빈 값이면 null.
export function parseClientCodeNumber(code: string | null | undefined): number | null {
  if (!code) return null;
  const match = /^CL-(\d+)$/.exec(code);
  return match ? Number(match[1]) : null;
}

// 최대 번호 + 1을 3자리로 부여(번호 재사용 안 함). 빈 목록이면 001.
export function nextClientCode(existingCodes: string[]): string {
  const maxNum = existingCodes
    .filter((c) => c.startsWith(`${PREFIX}-`))
    .reduce((max, c) => {
      const n = parseClientCodeNumber(c);
      return n != null && n > max ? n : max;
    }, 0);
  return `${PREFIX}-${String(maxNum + 1).padStart(3, '0')}`;
}
