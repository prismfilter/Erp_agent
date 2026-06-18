# 작가 코드 부여 + 계약 상태 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 작가에게 고유 코드(전속 `EX-001`·일반 `GN-001`)를 자동 부여하고, 작가 마스터에 코드·계약상태 컬럼을 추가하며, 구분 변경 시 코드 접두사를 자동 재배정한다.

**Architecture:** `writers.writer_code`(NOT NULL·UNIQUE)를 추가하고, 코드 생성/재배정 로직은 순수 TS 헬퍼(`writerCode.ts`)로 분리해 API(POST/PATCH)에서 사용한다(DB 트리거 미사용 — 코드베이스 일관·테스트 용이). 계약 상태는 이미 존재하는 `writers.status` 컬럼(`active`/`terminated`)을 재사용한다. 코드는 작가 마스터에서만 노출하고, 저작물 DB·청구서·정산서에는 추가하지 않는다(추후 백엔드 식별자).

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript strict, Supabase(PostgreSQL), Zod, Tailwind v4, vitest(node), Playwright(검증).

## Global Constraints

- TypeScript strict — `any` 금지. 들여쓰기 2칸. 주석·문서 한국어. 변수/함수 camelCase, 컴포넌트 PascalCase.
- **코드 형식:** `EX-NNN`(전속작가) / `GN-NNN`(일반작가), N=3자리 0패딩, prefix별 `max(기존번호)+1`(번호 재사용 안 함).
- **불변성:** `writer_code`는 사용자가 직접 입력·수정 불가. 등록 폼은 읽기전용 미리보기, API 수정 스키마에 미포함. 변경은 오직 "구분 변경 트리거"로만.
- **계약 상태:** 기존 `writers.status` 재사용. `active`(기본)=활성화(초록), `terminated`=해지(빨강).
- **노출 범위:** `writer_code`는 **작가 마스터 페이지에서만** 표시. 저작물 DB/청구서/정산서 UI·API select에 추가하지 않는다.
- **연동(추후):** 실제 데이터 연동은 이번 범위 밖. 미래 연동은 `writers.id`(불변 UUID) 기준 → 코드 변경이 join으로 자동 전파(코드는 writers 1곳에만 존재).
- **신규 npm 의존성 금지.** 마이그레이션은 016~018과 동일 방식(Supabase Management API 또는 SQL editor)으로 적용.
- **DB:** project ref `aqsrhesndraehhlonqib`. writers 테이블에는 이미 `status VARCHAR(20) DEFAULT 'active'`, `name UNIQUE`가 존재.
- 커밋/푸시/머지는 **사용자가 명시적으로 지시할 때만**. dev 서버 포트 **3001**.

---

## File Structure

| 파일 | 책임 | 작업 |
|---|---|---|
| `supabase/migrations/019_writer_code_and_contract_status.sql` | writer_code 추가·백필·제약 + status 정규화·CHECK | 신규 |
| `src/lib/writers/writerCode.ts` | 코드 prefix/파싱/다음코드/재배정여부 순수 로직 | 신규 |
| `src/lib/writers/writerCode.test.ts` | 위 순수 로직 단위테스트 | 신규 |
| `src/types/invoice.ts` | `Writer.writer_code` 추가 | 수정(소) |
| `src/lib/validation/schemas.ts` | `writerUpdateSchema.status` 추가 | 수정(소) |
| `src/app/api/writers/route.ts` | GET/POST select에 writer_code, POST 코드 자동부여 | 수정 |
| `src/app/api/writers/[id]/route.ts` | PATCH 구분변경 재배정 + status + select | 수정 |
| `src/app/(dashboard)/admin/writers/page.tsx` | 작가코드 컬럼(첫)·계약상태 컬럼(재계약일 우측)·등록폼 코드 미리보기 | 수정 |

**현재 사실(조사 결과):**
- `writers` 테이블(001_init_schema): `id UUID`, `name VARCHAR(100) NOT NULL UNIQUE`, `writer_type VARCHAR(20)`, `status VARCHAR(20) DEFAULT 'active'`, `created_at`, `updated_at`. 이후 011/017/018에서 `fee_rate`, `permanent_rate`, `general_rate`, `recontract_date` 추가.
- `Writer` 타입에 `status: string` 이미 존재. API select 3곳에 `status` 이미 포함.
- writers API는 `requireStaff(true)`(ADMIN) + adminClient(service role, RLS 우회). PATCH는 `parsed.data`를 generic 루프로 반영.
- 마이그레이션은 트리거/함수 없이 단순 ALTER+백필 패턴(011/017/018).
- 작가 마스터 표 컬럼(현재): 작가명 | 구분 | 영구저작물(%) | 일반저작물(%) | 용역요율(%) | 재계약일 | (액션). 행 `<tr key={w.id} id={`row-${w.id}`}>`. 정렬 훅 `useTableSort`(키 `pf_sort_writers`).

---

## Task 1: 마이그레이션 019 — writer_code + 계약상태(status)

**Files:**
- Create: `supabase/migrations/019_writer_code_and_contract_status.sql`

- [ ] **Step 1: 적용 전 데이터 점검** — 기존 작가 구분이 전속/일반뿐인지 확인(아니면 백필 NULL → NOT NULL 실패)

Supabase SQL editor 또는 Management API로 실행:
```sql
SELECT writer_type, count(*) FROM public.writers GROUP BY writer_type;
```
Expected: `전속작가`, `일반작가`만 존재(그 외 값이 있으면 먼저 정리).

- [ ] **Step 2: 마이그레이션 파일 작성** — `supabase/migrations/019_writer_code_and_contract_status.sql`

```sql
-- ============================================================================
-- 작가 마스터: 작가 코드(writer_code) + 계약 상태(status 재사용) (019_...)
-- writer_code: 전속 EX-001.., 일반 GN-001.. 고유 코드. 중복·수정 불가(앱 강제).
--   데이터 연동용 식별자. 작가 마스터에서만 노출, 저작물/청구서/정산서엔 백엔드 식별자(추후).
-- status: 기존 컬럼(DEFAULT 'active') 재사용 → 계약 상태. active=활성화, terminated=해지.
-- 참조 패턴: 011/017/018_writers_*. 1회 실행 전제(UNIQUE/CHECK는 멱등 아님).
-- ============================================================================

-- 1) writer_code 컬럼 추가 (nullable로 추가 후 백필 → NOT NULL)
ALTER TABLE public.writers
  ADD COLUMN IF NOT EXISTS writer_code VARCHAR(10);

-- 2) 기존 작가 백필: 구분별 created_at 오름차순으로 EX-/GN- 순번 부여
WITH numbered AS (
  SELECT
    id,
    CASE writer_type
      WHEN '전속작가' THEN 'EX'
      WHEN '일반작가' THEN 'GN'
    END AS prefix,
    ROW_NUMBER() OVER (
      PARTITION BY writer_type
      ORDER BY created_at ASC, id ASC
    ) AS rn
  FROM public.writers
)
UPDATE public.writers w
SET writer_code = n.prefix || '-' || LPAD(n.rn::text, 3, '0')
FROM numbered n
WHERE w.id = n.id
  AND n.prefix IS NOT NULL;

-- 3) NOT NULL + UNIQUE (구분이 전속/일반이 아닌 행이 있으면 이 단계에서 실패 → 데이터 점검 신호)
ALTER TABLE public.writers
  ALTER COLUMN writer_code SET NOT NULL;
ALTER TABLE public.writers
  ADD CONSTRAINT writers_writer_code_unique UNIQUE (writer_code);

COMMENT ON COLUMN public.writers.writer_code IS '작가 고유 코드 EX-001(전속)/GN-001(일반). 중복·수정 불가, 데이터 연동 식별자';

-- 4) status(계약 상태) 정규화 + 기본값/NOT NULL/CHECK. active=활성화(기본), terminated=해지
UPDATE public.writers
SET status = 'active'
WHERE status IS NULL OR status NOT IN ('active', 'terminated');

ALTER TABLE public.writers
  ALTER COLUMN status SET DEFAULT 'active';
ALTER TABLE public.writers
  ALTER COLUMN status SET NOT NULL;
ALTER TABLE public.writers
  ADD CONSTRAINT writers_status_check CHECK (status IN ('active', 'terminated'));

COMMENT ON COLUMN public.writers.status IS '계약 상태: active=활성화 | terminated=해지';
```

- [ ] **Step 3: 마이그레이션 적용** — 016~018과 동일 방식

방법 A) Supabase Management API (access token = Supabase 개인 액세스 토큰):
```bash
curl -sS -X POST "https://api.supabase.com/v1/projects/aqsrhesndraehhlonqib/database/query" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  --data-binary @<(jq -Rs '{query: .}' supabase/migrations/019_writer_code_and_contract_status.sql)
```
방법 B) Supabase 대시보드 SQL editor에 019 파일 내용을 붙여넣고 실행.

- [ ] **Step 4: 적용 검증**

```sql
SELECT writer_code, name, writer_type, status FROM public.writers ORDER BY writer_code;
```
Expected: 전속작가는 `EX-001`부터, 일반작가는 `GN-001`부터 순번 부여. 모든 `status='active'`. NULL 없음.

- [ ] **Step 5: 커밋(사용자 지시 시)**

```bash
git add supabase/migrations/019_writer_code_and_contract_status.sql
git commit -m "Feat: writers 작가코드(writer_code) 컬럼 + 계약상태(status) 마이그레이션"
```

---

## Task 2: 코드 생성 순수 헬퍼 + 단위테스트 (TDD)

**Files:**
- Create: `src/lib/writers/writerCode.ts`
- Test: `src/lib/writers/writerCode.test.ts`

**Interfaces:**
- Produces:
  - `codePrefix(writerType: string): 'EX' | 'GN' | null`
  - `parseCodeNumber(code: string | null | undefined): number | null`
  - `nextWriterCode(existingCodes: string[], writerType: string): string`
  - `needsRecode(currentCode: string | null, newType: string): boolean`

- [ ] **Step 1: 실패하는 테스트 작성** — `src/lib/writers/writerCode.test.ts`

```ts
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
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run src/lib/writers/writerCode.test.ts`
Expected: FAIL — "Cannot find module './writerCode'"

- [ ] **Step 3: 구현** — `src/lib/writers/writerCode.ts`

```ts
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

// 같은 접두사 중 최대 번호 + 1을 3자리로 부여(번호 재사용 안 함). 빈 목록이면 001.
export function nextWriterCode(existingCodes: string[], writerType: string): string {
  const prefix = codePrefix(writerType);
  if (!prefix) throw new Error(`알 수 없는 작가 구분: ${writerType}`);
  const maxNum = existingCodes
    .filter((c) => c.startsWith(`${prefix}-`))
    .reduce((max, c) => {
      const n = parseCodeNumber(c);
      return n != null && n > max ? n : max;
    }, 0);
  return `${prefix}-${String(maxNum + 1).padStart(3, '0')}`;
}

// 구분 변경 시 코드 재배정이 필요한가(접두사가 달라졌거나 코드가 아직 없으면 true).
export function needsRecode(currentCode: string | null, newType: string): boolean {
  const prefix = codePrefix(newType);
  if (!prefix) return false; // 알 수 없는 구분이면 손대지 않음
  if (!currentCode) return true;
  return !currentCode.startsWith(`${prefix}-`);
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run src/lib/writers/writerCode.test.ts`
Expected: PASS (전체 통과)

- [ ] **Step 5: 커밋(사용자 지시 시)**

```bash
git add src/lib/writers/writerCode.ts src/lib/writers/writerCode.test.ts
git commit -m "Feat: 작가 코드 생성·재배정 순수 헬퍼 + 단위테스트"
```

---

## Task 3: 타입 · 검증 스키마

**Files:**
- Modify: `src/types/invoice.ts`
- Modify: `src/lib/validation/schemas.ts`

**Interfaces:**
- Produces: `Writer.writer_code: string`, `writerUpdateSchema`에 `status?: 'active' | 'terminated'`.

- [ ] **Step 1: Writer 타입에 writer_code 추가** — `src/types/invoice.ts` (현재 22~32행)

변경 전:
```ts
export interface Writer {
  id: string;
  name: string;
  writer_type: string;            // '전속작가' | '일반작가'
```
변경 후:
```ts
export interface Writer {
  id: string;
  writer_code: string;            // 고유 코드 EX-001(전속)/GN-001(일반), 수정 불가
  name: string;
  writer_type: string;            // '전속작가' | '일반작가'
```

- [ ] **Step 2: writerUpdateSchema에 status 추가** — `src/lib/validation/schemas.ts` (현재 89~96행)

변경 전:
```ts
export const writerUpdateSchema = z.object({
  name: z.string().trim().min(1).optional(),
  writer_type: WRITER_TYPE.optional(),
  fee_rate: z.number().min(0).max(100).optional(),
  permanent_rate: z.number().min(0).max(100).nullable().optional(),
  general_rate: z.number().min(0).max(100).nullable().optional(),
  recontract_date: z.string().nullable().optional(),
});
```
변경 후:
```ts
export const writerUpdateSchema = z.object({
  name: z.string().trim().min(1).optional(),
  writer_type: WRITER_TYPE.optional(),
  fee_rate: z.number().min(0).max(100).optional(),
  permanent_rate: z.number().min(0).max(100).nullable().optional(),
  general_rate: z.number().min(0).max(100).nullable().optional(),
  recontract_date: z.string().nullable().optional(),
  // 계약 상태(활성화/해지). writer_code는 직접 수정 불가하므로 스키마에 포함하지 않는다.
  status: z.enum(['active', 'terminated']).optional(),
});
```

> 주의: `writer_code`는 어느 스키마에도 추가하지 않는다(불변·서버 전용).

- [ ] **Step 3: 타입체크**

Run: `npm run type-check`
Expected: 일부 파일(작가 페이지 등)에서 `writer_code` 미사용은 에러 아님. 통과(0 error). (페이지는 Task 6에서 사용)

- [ ] **Step 4: 커밋(사용자 지시 시)**

```bash
git add src/types/invoice.ts src/lib/validation/schemas.ts
git commit -m "Feat: Writer 타입 writer_code + 계약상태 검증 스키마"
```

---

## Task 4: API POST/GET — 코드 자동 부여

**Files:**
- Modify: `src/app/api/writers/route.ts`

**Interfaces:**
- Consumes: `nextWriterCode` (Task 2).
- Produces: POST가 `writer_code`를 자동 부여해 저장, 응답 writer에 `writer_code` 포함.

- [ ] **Step 1: 파일 전면 교체** — `src/app/api/writers/route.ts`

```ts
// 작가 마스터 목록 / 등록 (로그인 계정과 무관한 작가/작업자 레지스트리)

import { NextRequest, NextResponse } from 'next/server';
import { requireStaff, isErrorResponse } from '@/lib/auth/apiAuth';
import { parseBody } from '@/lib/validation/parse';
import { writerCreateSchema } from '@/lib/validation/schemas';
import { nextWriterCode } from '@/lib/writers/writerCode';

// 응답·조회 공통 컬럼(작가 코드 포함)
const WRITER_SELECT =
  'id, writer_code, name, writer_type, fee_rate, permanent_rate, general_rate, recontract_date, status, created_at';

// GET /api/writers — 목록 (ADMIN/STAFF 조회)
export async function GET() {
  try {
    const auth = await requireStaff();
    if (isErrorResponse(auth)) return auth;

    const { data, error } = await auth.adminClient
      .from('writers')
      .select(WRITER_SELECT)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ writers: data });
  } catch (err) {
    console.error('작가 마스터 목록 API 오류:', err);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

// POST /api/writers — 작가 등록 (ADMIN only). writer_code는 서버가 자동 부여(클라 입력 무시).
export async function POST(request: NextRequest) {
  try {
    const auth = await requireStaff(true);
    if (isErrorResponse(auth)) return auth;

    const parsed = parseBody(writerCreateSchema, await request.json());
    if (!parsed.success) return parsed.response;
    const { name, writer_type, fee_rate, permanent_rate, general_rate, recontract_date } = parsed.data;

    // 동시 등록으로 코드가 겹치는 희박한 경우 대비 1회 재시도(UNIQUE 제약이 최종 방어선)
    let lastMessage = '작가 코드 생성에 실패했습니다.';
    for (let attempt = 0; attempt < 2; attempt++) {
      const { data: rows } = await auth.adminClient.from('writers').select('writer_code');
      const codes = (rows ?? [])
        .map((r) => r.writer_code as string | null)
        .filter((c): c is string => !!c);
      const writer_code = nextWriterCode(codes, writer_type);

      const { data, error } = await auth.adminClient
        .from('writers')
        .insert({
          writer_code,
          name,
          writer_type,
          fee_rate,
          permanent_rate: permanent_rate ?? null,
          general_rate: general_rate ?? null,
          recontract_date: recontract_date ?? null,
        })
        .select(WRITER_SELECT)
        .single();

      if (!error) return NextResponse.json({ writer: data }, { status: 201 });

      if (error.code === '23505' && error.message.includes('writer_code')) {
        lastMessage = error.message;
        continue; // 코드 충돌 → 재계산 재시도
      }
      if (error.code === '23505') {
        return NextResponse.json({ error: '이미 등록된 작가명입니다.' }, { status: 409 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ error: lastMessage }, { status: 500 });
  } catch (err) {
    console.error('작가 마스터 등록 API 오류:', err);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
```

- [ ] **Step 2: 타입·린트**

Run: `npm run type-check && npx eslint src/app/api/writers/route.ts`
Expected: 출력 없음(에러 0)

- [ ] **Step 3: API 스모크(dev 3001, 인증 세션 필요)** — Playwright로 작가 등록 후 응답에 `writer_code`가 `EX-`/`GN-`로 시작하는지 확인(Task 6 UI에서 통합 확인). 여기서는 type/lint만으로 통과 처리.

- [ ] **Step 4: 커밋(사용자 지시 시)**

```bash
git add src/app/api/writers/route.ts
git commit -m "Feat: 작가 등록 시 writer_code 자동 부여(POST)"
```

---

## Task 5: API PATCH — 구분 변경 재배정 + 계약상태

**Files:**
- Modify: `src/app/api/writers/[id]/route.ts`

**Interfaces:**
- Consumes: `needsRecode`, `nextWriterCode` (Task 2).
- Produces: 구분 변경 시 `writer_code` 자동 재배정, `status` 갱신 반영.

- [ ] **Step 1: PATCH 핸들러 교체** — `src/app/api/writers/[id]/route.ts` (import + PATCH)

import 블록 교체:
```ts
import { NextRequest, NextResponse } from 'next/server';
import { requireStaff, isErrorResponse } from '@/lib/auth/apiAuth';
import { parseBody } from '@/lib/validation/parse';
import { writerUpdateSchema } from '@/lib/validation/schemas';
import { needsRecode, nextWriterCode } from '@/lib/writers/writerCode';

const WRITER_SELECT =
  'id, writer_code, name, writer_type, fee_rate, permanent_rate, general_rate, recontract_date, status, created_at';
```

PATCH 함수 교체(현재 8~44행):
```ts
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireStaff(true);
    if (isErrorResponse(auth)) return auth;

    const { id } = await params;
    const parsed = parseBody(writerUpdateSchema, await request.json());
    if (!parsed.success) return parsed.response;

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    for (const [key, value] of Object.entries(parsed.data)) {
      if (value !== undefined) updates[key] = value;
    }

    // 구분 변경 트리거: 접두사가 달라지면 새 prefix의 다음 번호로 코드 재배정.
    // writer_code는 직접 수정 불가하므로, 오직 이 경로로만 변경된다.
    if (parsed.data.writer_type !== undefined) {
      const { data: current } = await auth.adminClient
        .from('writers')
        .select('writer_code')
        .eq('id', id)
        .single();
      if (current && needsRecode(current.writer_code as string | null, parsed.data.writer_type)) {
        const { data: rows } = await auth.adminClient
          .from('writers')
          .select('writer_code')
          .neq('id', id);
        const codes = (rows ?? [])
          .map((r) => r.writer_code as string | null)
          .filter((c): c is string => !!c);
        updates.writer_code = nextWriterCode(codes, parsed.data.writer_type);
      }
    }

    const { data, error } = await auth.adminClient
      .from('writers')
      .update(updates)
      .eq('id', id)
      .select(WRITER_SELECT)
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: '이미 등록된 작가명입니다.' }, { status: 409 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ writer: data });
  } catch (err) {
    console.error('작가 마스터 수정 API 오류:', err);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
```

> DELETE 함수는 변경 없음(그대로 유지).

- [ ] **Step 2: 타입·린트**

Run: `npm run type-check && npx eslint "src/app/api/writers/[id]/route.ts"`
Expected: 출력 없음(에러 0)

- [ ] **Step 3: 커밋(사용자 지시 시)**

```bash
git add "src/app/api/writers/[id]/route.ts"
git commit -m "Feat: 구분 변경 시 writer_code 재배정 + 계약상태 수정(PATCH)"
```

---

## Task 6: 작가 마스터 UI — 코드 컬럼·계약상태·등록폼 미리보기

**Files:**
- Modify: `src/app/(dashboard)/admin/writers/page.tsx`

**Interfaces:**
- Consumes: `nextWriterCode` (Task 2), `Writer.writer_code`/`Writer.status` (Task 3).

- [ ] **Step 1: import + 정렬키 + 코드 미리보기 추가**

import 블록(현재 `useRowFocus` 줄 아래)에 추가:
```tsx
import { nextWriterCode } from '@/lib/writers/writerCode';
```

`useTableSort` 설정(현재 410~417행)에 두 키 추가:
```tsx
  const { sortKey, dir, toggle, sortRows } = useTableSort<Writer>({
    writer_code: (w) => w.writer_code,
    name: (w) => w.name,
    writer_type: (w) => w.writer_type,
    permanent_rate: (w) => w.permanent_rate,
    general_rate: (w) => w.general_rate,
    fee_rate: (w) => w.fee_rate,
    recontract_date: (w) => w.recontract_date,
    status: (w) => w.status,
  }, 'pf_sort_writers');
```

`useRowFocus(...)` 호출 바로 아래에 코드 미리보기 추가:
```tsx
  // 등록 폼 작가 코드 미리보기 — 구분에 따라 다음 코드를 보여줌(서버가 최종 부여, 읽기전용)
  const previewCode = useMemo(
    () => nextWriterCode(writers.map((w) => w.writer_code).filter(Boolean), newType),
    [writers, newType]
  );
```

- [ ] **Step 2: 계약 상태 셀 컴포넌트 추가** — `DateCell` 컴포넌트 정의 바로 아래(현재 297행 이후)에 추가

```tsx
// 계약 상태 토글 셀 — active=활성화(초록)/terminated=해지(빨강). ADMIN만 변경.
function ContractStatusCell({
  value,
  editable,
  onSave,
}: {
  value: string;
  editable: boolean;
  onSave: (v: 'active' | 'terminated') => Promise<void>;
}) {
  const isActive = value !== 'terminated';

  if (!editable) {
    return (
      <span
        className={`inline-block px-3 py-1 rounded-md text-xs font-medium ${
          isActive ? 'bg-green-500/15 text-green-500' : 'bg-red-500/15 text-red-400'
        }`}
      >
        {isActive ? '활성화' : '해지'}
      </span>
    );
  }

  return (
    <div className="inline-flex items-center gap-1">
      <button
        type="button"
        onClick={() => { if (!isActive) onSave('active'); }}
        className={`px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer ${
          isActive
            ? 'bg-green-500/20 text-green-500 ring-1 ring-green-500/40'
            : 'text-muted-foreground hover:bg-green-500/10'
        }`}
      >
        활성화
      </button>
      <button
        type="button"
        onClick={() => { if (isActive) onSave('terminated'); }}
        className={`px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer ${
          !isActive
            ? 'bg-red-500/20 text-red-400 ring-1 ring-red-500/40'
            : 'text-muted-foreground hover:bg-red-500/10'
        }`}
      >
        해지
      </button>
    </div>
  );
}
```

- [ ] **Step 3: 등록 폼에 작가 코드 미리보기 블럭 추가** — 작가명 입력 `<div className="w-64">` 바로 앞(현재 461행 직전)에 삽입

```tsx
          <div>
            <label className="block text-xs text-muted-foreground mb-1 text-center">작가 코드</label>
            <div
              className="w-24 px-3 py-2 text-sm text-center bg-muted/50 border border-border rounded-lg text-muted-foreground font-mono tabular-nums select-none"
              title="구분에 따라 자동 부여 (중복·수정 불가)"
            >
              {previewCode}
            </div>
          </div>
```

- [ ] **Step 4: 표 헤더에 작가코드(첫)·계약상태(재계약일 우측) 추가** — `<tr>` 헤더(현재 597~605행) 교체

```tsx
                <tr>
                  <SortableHeader label="작가 코드" sortKey="writer_code" activeKey={sortKey} dir={dir} onSort={toggle} className="px-6 py-2.5 text-xs uppercase" />
                  <SortableHeader label="작가명" sortKey="name" activeKey={sortKey} dir={dir} onSort={toggle} className="px-6 py-2.5 text-xs uppercase" />
                  <SortableHeader label="구분" sortKey="writer_type" activeKey={sortKey} dir={dir} onSort={toggle} align="center" className="px-6 py-2.5 text-xs uppercase" />
                  <SortableHeader label="영구 저작물(%)" sortKey="permanent_rate" activeKey={sortKey} dir={dir} onSort={toggle} align="center" className="px-6 py-2.5 text-xs uppercase" />
                  <SortableHeader label="일반 저작물(%)" sortKey="general_rate" activeKey={sortKey} dir={dir} onSort={toggle} align="center" className="px-6 py-2.5 text-xs uppercase" />
                  <SortableHeader label="용역 요율(%)" sortKey="fee_rate" activeKey={sortKey} dir={dir} onSort={toggle} align="center" className="px-6 py-2.5 text-xs uppercase" />
                  <SortableHeader label="재계약일" sortKey="recontract_date" activeKey={sortKey} dir={dir} onSort={toggle} align="center" className="px-6 py-2.5 text-xs uppercase" />
                  <SortableHeader label="계약 상태" sortKey="status" activeKey={sortKey} dir={dir} onSort={toggle} align="center" className="px-6 py-2.5 text-xs uppercase" />
                  {isAdmin && <th className="px-6 py-2.5 text-center font-bold text-foreground text-xs uppercase w-24">액션</th>}
                </tr>
```

- [ ] **Step 5: 표 본문에 작가코드 셀(첫)·계약상태 셀(재계약일 우측) 추가** — `filtered.map` 행 본문(현재 608~637행) 교체

변경 전(행 시작 ~ 재계약일 셀):
```tsx
                {filtered.map((w) => (
                  <tr key={w.id} id={`row-${w.id}`} className="hover:bg-primary/5">
                    <td className="px-6 py-2.5">
                      <NameCell value={w.name} editable={isAdmin} onSave={(v) => patchWriter(w.id, { name: v })} />
                    </td>
```
변경 후:
```tsx
                {filtered.map((w) => (
                  <tr key={w.id} id={`row-${w.id}`} className="hover:bg-primary/5">
                    <td className="px-6 py-2.5">
                      <span className="font-mono text-xs tabular-nums text-foreground">{w.writer_code}</span>
                    </td>
                    <td className="px-6 py-2.5">
                      <NameCell value={w.name} editable={isAdmin} onSave={(v) => patchWriter(w.id, { name: v })} />
                    </td>
```

그리고 재계약일 셀(현재 635~637행) 바로 뒤에 계약상태 셀 추가:
```tsx
                    <td className="px-6 py-2.5 text-center">
                      <DateCell value={w.recontract_date} editable={isAdmin} onSave={(v) => patchWriter(w.id, { recontract_date: v })} />
                    </td>
                    <td className="px-6 py-2.5 text-center">
                      <ContractStatusCell value={w.status} editable={isAdmin} onSave={(v) => patchWriter(w.id, { status: v })} />
                    </td>
```

> `patchWriter`의 시그니처는 `Partial<Pick<Writer, 'name' | 'writer_type' | 'fee_rate' | 'permanent_rate' | 'general_rate' | 'recontract_date'>>`이다. `status`를 받도록 Step 6에서 확장한다.

- [ ] **Step 6: patchWriter 타입에 status 추가** — `patchWriter` 정의(현재 383행)

변경 전:
```tsx
  const patchWriter = async (id: string, patch: Partial<Pick<Writer, 'name' | 'writer_type' | 'fee_rate' | 'permanent_rate' | 'general_rate' | 'recontract_date'>>) => {
```
변경 후:
```tsx
  const patchWriter = async (id: string, patch: Partial<Pick<Writer, 'name' | 'writer_type' | 'fee_rate' | 'permanent_rate' | 'general_rate' | 'recontract_date' | 'status'>>) => {
```

- [ ] **Step 7: 타입·린트**

Run: `npm run type-check && npx eslint "src/app/(dashboard)/admin/writers/page.tsx"`
Expected: 출력 없음(에러 0)

- [ ] **Step 8: Playwright 시각 확인(dev 3001, 인증)** — 작가 마스터에서:
  1. 첫 컬럼이 "작가 코드"(EX-/GN-)이고 편집 버튼이 없다(읽기전용).
  2. 재계약일 우측에 "계약 상태" 컬럼, 활성화(초록)/해지(빨강) 토글.
  3. 등록 폼 맨 앞 작가 코드 블럭이 구분(전속/일반) 선택에 따라 다음 코드로 바뀐다.

- [ ] **Step 9: 커밋(사용자 지시 시)**

```bash
git add "src/app/(dashboard)/admin/writers/page.tsx"
git commit -m "Feat: 작가 마스터 작가코드 컬럼·계약상태 토글·등록폼 코드 미리보기"
```

---

## Task 7: 통합 검증

**Files:** (변경 없음 — 전체 검증)

- [ ] **Step 1: 정적 검사 + 단위테스트**

Run:
```bash
npm run type-check
npx eslint src/
npx vitest run
```
Expected: type-check 0 error / eslint 0 error(기존 img 경고는 무관) / vitest 전체 통과.

- [ ] **Step 2: 빌드**

Run: `npm run build`
Expected: 성공.

- [ ] **Step 3: Playwright 엔드투엔드(인증 세션, 포트 3001)**

1. **코드 표시·불변:** 작가 마스터 첫 컬럼에 `EX-`/`GN-` 코드. 코드 셀에 입력/편집 UI 없음.
2. **등록:** 새 작가 등록 → 응답·표에 다음 순번 코드(예 다음 EX/GN)가 자동 부여.
3. **계약 상태:** 한 작가를 [해지]로 토글 → 빨강 표시 + 새로고침 후 유지. [활성화]로 복귀.
4. **구분 변경 재코드:** 일반작가(GN-xxx) 한 명을 전속작가로 변경 → 코드가 `EX-(다음 빈 번호)`로 바뀜(기존 EX 번호와 중복 안 됨). 다시 일반으로 변경 → `GN-(다음 빈 번호)`.
5. **타 화면 비노출:** 저작물 DB(`/admin/works/permanent`)·청구서 상세에 `EX-`/`GN-` 코드가 렌더되지 않음(부재 확인).
6. 콘솔 에러 0.

- [ ] **Step 4: 커밋(사용자 지시 시)** — 잔여 변경 정리 커밋.

---

## Self-Review

**1. Spec coverage**
- writer_code(전속 EX-/일반 GN-, 3자리) → Task 1(컬럼·백필) + Task 2(생성) + Task 4(부여). ✓
- supabase 컬럼명 `writer_code` → Task 1. ✓
- 작가 마스터에만 노출, 작가명 좌측 첫 컬럼 → Task 6 Step 4·5. 타 화면 비노출 → Global Constraints + Task 7 Step 3.5. ✓
- 등록 폼 작가명 좌측 코드 블럭(중복·수정 불가) → Task 6 Step 3(읽기전용 미리보기) + 스키마 미포함(Task 3). ✓
- 계약 상태 컬럼(재계약일 우측, 초록 활성화/빨강 해지, 기본 활성화) → Task 1(status 기본 active) + Task 6(ContractStatusCell). ✓
- 구분 변경 트리거(prefix 변경 + 중복 안 되는 번호 + 코드가 작가에 귀속) → Task 2 `needsRecode`/`nextWriterCode` + Task 5 PATCH. 연동 자동전파는 코드가 writers 단일 위치 + 미래 id 연동으로 설계(Global Constraints). ✓
- 유지보수성: 순수 로직 분리·단위테스트·DB는 단순 ALTER·UNIQUE 무결성. ✓

**2. Placeholder scan** — 모든 코드 스텝에 실제 코드/명령/기대출력 포함. "TODO/적절히" 없음. ✓

**3. Type consistency**
- `nextWriterCode(existingCodes: string[], writerType: string): string` — Task 2 정의 = Task 4/5/6 호출 일치. ✓
- `needsRecode(currentCode: string | null, newType: string)` — Task 2 = Task 5 일치. ✓
- `WRITER_SELECT`에 `writer_code` 포함 — Task 4·5 동일 문자열. ✓
- `Writer.writer_code: string`(Task 3) = 페이지·API 사용(Task 4/5/6) 일치. ✓
- `status` 값 `'active' | 'terminated'` — 스키마(Task 3)·DB CHECK(Task 1)·UI(Task 6) 일치. ✓

**알려진 한계(문서화):** PATCH 재배정은 단일 관리자 가정으로 재시도 없음(POST만 1회 재시도). 실제 데이터 연동(works/invoice ↔ writer_code)은 범위 밖(추후, id 기준 설계 권장).

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-06-18-writer-code-and-contract-status.md`. Two execution options:

1. **Subagent-Driven (recommended)** — 태스크마다 새 서브에이전트 디스패치, 태스크 사이 리뷰.
2. **Inline Execution** — 이 세션에서 executing-plans로 체크포인트 배치 실행.

Which approach?
