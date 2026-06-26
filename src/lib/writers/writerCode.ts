// 작가 코드 생성·재배정 순수 로직 — 전속 EX-NNN / 일반 GN-NNN.
// DOM·DB 비의존 → vitest(node)로 단위테스트. API(POST/PATCH)와 등록 폼 미리보기가 공용으로 사용.

const PREFIX_BY_TYPE: Record<string, 'EX' | 'GN'> = {
  전속작가: 'EX',
  일반작가: 'GN',
};

// 작가 구분 → 코드 접두사. 알 수 없는 구분은 null.
export function codePrefix(writerType: string): 'EX' | 'GN' | null {
  return PREFIX_BY_TYPE[writerType] ?? null;
}

// 'EX-007' → 7. 형식이 다르거나 빈 값이면 null.
export function parseCodeNumber(code: string | null | undefined): number | null {
  if (!code) return null;
  const match = /^(?:EX|GN)-(\d+)$/.exec(code);
  return match ? Number(match[1]) : null;
}

// 같은 접두사에서 비어 있는 가장 작은 번호를 3자리로 부여(빈 번호 먼저 채움).
// 1부터 순회해 사용 중이 아닌 첫 번호를 반환 → 중간/맨 앞 공백을 메우고, 연속이면 자연히 최대+1.
export function nextWriterCode(existingCodes: string[], writerType: string): string {
  const prefix = codePrefix(writerType);
  if (!prefix) throw new Error(`알 수 없는 작가 구분: ${writerType}`);
  const used = new Set(
    existingCodes
      .filter((c) => c.startsWith(`${prefix}-`))
      .map((c) => parseCodeNumber(c))
      .filter((n): n is number => n != null)
  );
  let n = 1;
  while (used.has(n)) n += 1;
  return `${prefix}-${String(n).padStart(3, '0')}`;
}

// 구분 변경 시 코드 재배정이 필요한가(접두사가 달라졌거나 코드가 아직 없으면 true).
export function needsRecode(currentCode: string | null, newType: string): boolean {
  const prefix = codePrefix(newType);
  if (!prefix) return false; // 알 수 없는 구분이면 손대지 않음
  if (!currentCode) return true;
  return !currentCode.startsWith(`${prefix}-`);
}
