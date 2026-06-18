# 구성원/관리자 페이지 — 이메일 컬럼 · 역할 세로 드롭다운 · 상세정보 모달 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 구성원·관리자용 페이지의 "사용자 ID" 컬럼을 "이메일"로 바꾸고, 관리자용 페이지의 역할 변경을 세로 드롭다운(그라디언트 블록)으로 교체하며, "상세정보" 컬럼의 [정보확인] 버튼으로 사용자 프로필 모달을 띄운다.

**Architecture:** `/api/admin/users`를 `auth.users`(서비스 롤 admin API)와 병합해 이메일·로그인 메타데이터를 함께 반환한다(병합은 순수 함수로 분리·테스트). 역할 선택은 기존 `WriterTypeSelect`와 동일한 base-ui `DropdownMenu` 패턴으로 재사용 컴포넌트화하고, 프로필 모달도 별도 컴포넌트로 만든다.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript strict, Supabase(service_role admin API), base-ui `DropdownMenu`, Tailwind v4, vitest(node), Playwright(검증).

## Global Constraints

- TypeScript strict — `any` 금지(불가피한 `any` 값은 구체 타입으로 캐스트). 들여쓰기 2칸. 주석 한국어. camelCase/PascalCase.
- 신규 npm 의존성 금지. 드롭다운은 기존 `@/components/ui/dropdown-menu` 재사용.
- 역할 선택은 **직접 입력 불가**(라디오 선택만). 블록 폭 8~10자(`min-w-[7.5rem]`), 배경은 검은색 금지 — **테마(primary) 그라디언트**.
- 이메일·메타데이터는 **읽기전용**(표시만). 역할 변경 PATCH는 기존 `/api/admin/users/[userId]` 그대로 사용.
- `/api/admin/users` GET은 **ADMIN 전용**(`requireStaff(true)`) — 기존 동작 유지. (STAFF의 구성원 페이지 접근 제약은 본 작업 범위 밖)
- 커밋/푸시/머지는 **사용자가 명시적으로 지시할 때만**. dev 서버 포트 **3001**.

---

## File Structure

| 파일 | 책임 | 작업 |
|---|---|---|
| `src/lib/admin/userMerge.ts` | user_roles + auth.users 병합 순수 로직 + 타입(`RoleRow`/`AuthLite`/`AdminUser`) | 신규 |
| `src/lib/admin/userMerge.test.ts` | 위 병합 단위테스트 | 신규 |
| `src/app/api/admin/users/route.ts` | GET에서 이메일·메타데이터 병합 반환 | 수정 |
| `src/components/admin/EmailCell.tsx` | 이메일 표시 + 복사 셀(두 페이지 공용) | 신규 |
| `src/components/admin/RoleSelect.tsx` | 역할 세로 드롭다운(그라디언트 블록) | 신규 |
| `src/components/admin/UserDetailModal.tsx` | [정보확인] 프로필 모달 | 신규 |
| `src/app/(dashboard)/staff/page.tsx` | 사용자 ID→이메일 컬럼 | 수정 |
| `src/app/(dashboard)/admin/accounts/page.tsx` | 이메일 컬럼 + 역할 세로 드롭다운 + 상세정보 컬럼/모달 | 수정 |

**현재 사실(조사 결과):**
- `/api/admin/users` GET: `requireStaff(true)`(ADMIN 전용), `user_roles`의 `id, user_id, name, role, contract_date, created_at` 반환(이메일 없음).
- `apiAuth`의 `adminClient`는 service_role `SupabaseClient` → `adminClient.auth.admin.listUsers()`로 이메일·메타데이터 조회 가능.
- 구성원(`staff`) 페이지: 컬럼 `이름 | 사용자 ID | 역할(읽기전용 배지) | 등록일`. `UserIdCell`로 user_id 표시. `Member`에 email 없음.
- 관리자용(`admin/accounts`) 페이지: 컬럼 `이름 | 사용자 ID | 현재 역할 | 등록일 | 역할 변경`. 역할 변경은 `ROLE_OPTIONS` 4개를 `flex gap-1 flex-wrap`(가로) 버튼으로 렌더. `handleChangeRole(userId, role)`로 PATCH. 페이지는 `if (!isAdmin()) router.push('/')`로 ADMIN 전용.
- 역할 변경 PATCH: `/api/admin/users/[userId]` (`adminUserUpdateSchema`: name/role/contract_date). 변경 불필요.
- 드롭다운 패턴: `src/app/(dashboard)/admin/writers/page.tsx`의 `WriterTypeSelect`(base-ui `DropdownMenu` + `DropdownMenuRadioGroup`/`DropdownMenuRadioItem`).

---

## Task 1: API 이메일 병합 + 순수 헬퍼 (TDD)

**Files:**
- Create: `src/lib/admin/userMerge.ts`
- Test: `src/lib/admin/userMerge.test.ts`
- Modify: `src/app/api/admin/users/route.ts`

**Interfaces:**
- Produces:
  - `interface RoleRow { id: string; user_id: string; name: string | null; role: string | null; contract_date: string | null; created_at: string }`
  - `interface AuthLite { id: string; email: string | null; last_sign_in_at: string | null; provider: string | null; avatar_url: string | null }`
  - `interface AdminUser extends RoleRow { email: string | null; last_sign_in_at: string | null; provider: string | null; avatar_url: string | null }`
  - `mergeUsersWithAuth(roles: RoleRow[], authUsers: AuthLite[]): AdminUser[]`

- [ ] **Step 1: 실패하는 테스트 작성** — `src/lib/admin/userMerge.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { mergeUsersWithAuth, type RoleRow, type AuthLite } from './userMerge';

const roles: RoleRow[] = [
  { id: 'r1', user_id: 'u1', name: '강진성', role: 'ADMIN', contract_date: null, created_at: '2026-06-01' },
  { id: 'r2', user_id: 'u2', name: null, role: 'STAFF', contract_date: '2026-05-01', created_at: '2026-06-02' },
];
const auth: AuthLite[] = [
  { id: 'u1', email: 'admin@prism-filter.com', last_sign_in_at: '2026-06-10', provider: 'google', avatar_url: 'http://x/a.png' },
];

describe('mergeUsersWithAuth', () => {
  it('user_id로 이메일·메타데이터를 병합', () => {
    const out = mergeUsersWithAuth(roles, auth);
    expect(out[0].email).toBe('admin@prism-filter.com');
    expect(out[0].provider).toBe('google');
    expect(out[0].avatar_url).toBe('http://x/a.png');
    expect(out[0].last_sign_in_at).toBe('2026-06-10');
  });
  it('auth에 없는 사용자는 이메일·메타데이터 null', () => {
    const out = mergeUsersWithAuth(roles, auth);
    expect(out[1].email).toBeNull();
    expect(out[1].last_sign_in_at).toBeNull();
    expect(out[1].provider).toBeNull();
    expect(out[1].avatar_url).toBeNull();
  });
  it('역할 행 정보(name/role/contract_date/created_at)는 보존', () => {
    const out = mergeUsersWithAuth(roles, auth);
    expect(out[0].name).toBe('강진성');
    expect(out[1].role).toBe('STAFF');
    expect(out[1].contract_date).toBe('2026-05-01');
    expect(out[0].created_at).toBe('2026-06-01');
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run src/lib/admin/userMerge.test.ts`
Expected: FAIL — "Cannot find module './userMerge'"

- [ ] **Step 3: 헬퍼 구현** — `src/lib/admin/userMerge.ts`

```ts
// 관리자 사용자 목록 — user_roles 행과 auth.users(이메일·메타데이터)를 병합하는 순수 로직.
// DOM·DB 비의존 → vitest(node)로 단위테스트. API 라우트가 Supabase User → AuthLite로 추출 후 이 함수를 호출.

export interface RoleRow {
  id: string;
  user_id: string;
  name: string | null;
  role: string | null;
  contract_date: string | null;
  created_at: string;
}

export interface AuthLite {
  id: string;
  email: string | null;
  last_sign_in_at: string | null;
  provider: string | null;
  avatar_url: string | null;
}

export interface AdminUser extends RoleRow {
  email: string | null;
  last_sign_in_at: string | null;
  provider: string | null;
  avatar_url: string | null;
}

// user_id 기준으로 auth 메타데이터를 붙인다. auth에 없는 사용자는 null.
export function mergeUsersWithAuth(roles: RoleRow[], authUsers: AuthLite[]): AdminUser[] {
  const byId = new Map(authUsers.map((a) => [a.id, a]));
  return roles.map((r) => {
    const a = byId.get(r.user_id);
    return {
      ...r,
      email: a?.email ?? null,
      last_sign_in_at: a?.last_sign_in_at ?? null,
      provider: a?.provider ?? null,
      avatar_url: a?.avatar_url ?? null,
    };
  });
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run src/lib/admin/userMerge.test.ts`
Expected: PASS (3 describe / 9 assertions)

- [ ] **Step 5: API 라우트 교체** — `src/app/api/admin/users/route.ts`

```ts
import { NextResponse } from 'next/server';
import { requireStaff, isErrorResponse } from '@/lib/auth/apiAuth';
import { mergeUsersWithAuth, type AuthLite, type RoleRow } from '@/lib/admin/userMerge';

export async function GET() {
  try {
    // 관리자 권한 확인
    const auth = await requireStaff(true);
    if (isErrorResponse(auth)) return auth;

    // user_roles 목록
    const { data: roles, error } = await auth.adminClient
      .from('user_roles')
      .select('id, user_id, name, role, contract_date, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // auth.users에서 이메일·메타데이터 (service_role 전용 admin API). 사용자 수가 적어 1페이지로 충분.
    const { data: authData } = await auth.adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const authUsers: AuthLite[] = (authData?.users ?? []).map((u) => ({
      id: u.id,
      email: u.email ?? null,
      last_sign_in_at: u.last_sign_in_at ?? null,
      provider: u.app_metadata?.provider ?? null,
      avatar_url:
        (u.user_metadata?.avatar_url as string | undefined) ??
        (u.user_metadata?.picture as string | undefined) ??
        null,
    }));

    const users = mergeUsersWithAuth((roles ?? []) as RoleRow[], authUsers);
    return NextResponse.json({ users });
  } catch (err) {
    console.error('API 오류:', err);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
```

- [ ] **Step 6: 타입·린트**

Run: `npm run type-check && npx eslint src/app/api/admin/users/route.ts src/lib/admin/userMerge.ts`
Expected: 출력 없음(에러 0)

- [ ] **Step 7: 커밋(사용자 지시 시)**

```bash
git add src/lib/admin/userMerge.ts src/lib/admin/userMerge.test.ts src/app/api/admin/users/route.ts
git commit -m "Feat: 관리자 사용자 API에 이메일·로그인 메타데이터 병합"
```

---

## Task 2: 공용 EmailCell 컴포넌트

**Files:**
- Create: `src/components/admin/EmailCell.tsx`

**Interfaces:**
- Produces: `EmailCell({ email: string | null; onCopy: (text: string) => void })`

- [ ] **Step 1: 작성** — `src/components/admin/EmailCell.tsx`

```tsx
'use client';

// 이메일 셀 — 이메일 표시 + 복사 버튼(사용자 ID 컬럼 대체). 두 페이지(구성원/관리자) 공용.
export function EmailCell({ email, onCopy }: { email: string | null; onCopy: (text: string) => void }) {
  if (!email) {
    return <span className="text-muted-foreground text-xs italic">미확인</span>;
  }
  return (
    <div className="flex items-center gap-1.5 group">
      <span className="text-foreground text-xs cursor-default" title={email}>{email}</span>
      <button
        onClick={() => onCopy(email)}
        className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-foreground transition rounded hover:bg-blue-600/10 cursor-pointer"
        title="이메일 복사"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/>
          <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
        </svg>
      </button>
    </div>
  );
}
```

- [ ] **Step 2: 린트**

Run: `npx eslint src/components/admin/EmailCell.tsx`
Expected: 출력 없음

- [ ] **Step 3: 커밋(사용자 지시 시)**

```bash
git add src/components/admin/EmailCell.tsx
git commit -m "Feat: 이메일 표시·복사 공용 셀 컴포넌트"
```

---

## Task 3: 구성원 페이지 — 사용자 ID → 이메일

**Files:**
- Modify: `src/app/(dashboard)/staff/page.tsx`

**Interfaces:**
- Consumes: `EmailCell` (Task 2). API 응답에 `email`(Task 1).

- [ ] **Step 1: import 교체 + isAdmin 제거** — 상단 import(현재 3~7행)

변경 전:
```tsx
import { useEffect, useState, useCallback, useMemo } from 'react';
import { useTableSort } from '@/hooks/useTableSort';
import { useRowFocus } from '@/hooks/useRowFocus';
import { SortableHeader } from '@/components/ui/SortableHeader';
import { useAuthStore } from '@/store/authStore';
```
변경 후:
```tsx
import { useEffect, useState, useCallback, useMemo } from 'react';
import { useTableSort } from '@/hooks/useTableSort';
import { useRowFocus } from '@/hooks/useRowFocus';
import { SortableHeader } from '@/components/ui/SortableHeader';
import { EmailCell } from '@/components/admin/EmailCell';
```

- [ ] **Step 2: Member 타입에 email 추가** — 현재 11~18행

변경 전:
```tsx
interface Member {
  id: string;
  user_id: string;
  name: string | null;
  role: MemberRole;
  contract_date: string | null;
  created_at: string;
}
```
변경 후:
```tsx
interface Member {
  id: string;
  user_id: string;
  name: string | null;
  email: string | null;
  role: MemberRole;
  contract_date: string | null;
  created_at: string;
}
```

- [ ] **Step 3: UserIdCell 정의 삭제** — 현재 128~149행의 `// 사용자 ID 셀 …`부터 `UserIdCell` 함수 전체를 삭제.

```tsx
// 사용자 ID 셀 — 전체 ID 표시(title)와 복사는 관리자만
function UserIdCell({ userId, onCopy, isAdmin }: { userId: string; onCopy: (id: string) => void; isAdmin: boolean }) {
  // ... (이 함수 블록 전체 삭제)
}
```

- [ ] **Step 4: isAdmin/user 선언 제거** — 현재 152~153행

변경 전:
```tsx
export default function StaffPage() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN';
  const [members, setMembers] = useState<Member[]>([]);
```
변경 후:
```tsx
export default function StaffPage() {
  const [members, setMembers] = useState<Member[]>([]);
```

- [ ] **Step 5: 헤더·셀 교체** — 현재 256행(헤더)과 267~269행(셀)

헤더 변경 전:
```tsx
                  <th className="px-6 py-3 text-left font-bold text-foreground text-xs uppercase">사용자 ID</th>
```
헤더 변경 후:
```tsx
                  <th className="px-6 py-3 text-left font-bold text-foreground text-xs uppercase">이메일</th>
```

셀 변경 전:
```tsx
                    <td className="px-6 py-4">
                      <UserIdCell userId={m.user_id} onCopy={handleCopy} isAdmin={isAdmin} />
                    </td>
```
셀 변경 후:
```tsx
                    <td className="px-6 py-4">
                      <EmailCell email={m.email} onCopy={handleCopy} />
                    </td>
```

- [ ] **Step 6: 타입·린트**

Run: `npm run type-check && npx eslint "src/app/(dashboard)/staff/page.tsx"`
Expected: 출력 없음(에러 0)

- [ ] **Step 7: 커밋(사용자 지시 시)**

```bash
git add "src/app/(dashboard)/staff/page.tsx"
git commit -m "Feat: 구성원 페이지 사용자 ID → 이메일 컬럼"
```

---

## Task 4: 역할 세로 드롭다운 컴포넌트 + 관리자용 페이지 적용

**Files:**
- Create: `src/components/admin/RoleSelect.tsx`
- Modify: `src/app/(dashboard)/admin/accounts/page.tsx`

**Interfaces:**
- Produces: `type AccountRole = 'ADMIN' | 'STAFF' | 'EXCLUSIVE_WRITER' | 'GENERAL_WRITER'`; `RoleSelect({ value: AccountRole | null; disabled?: boolean; onChange: (role: AccountRole) => void })`

- [ ] **Step 1: RoleSelect 작성** — `src/components/admin/RoleSelect.tsx`

```tsx
'use client';

// 역할 선택 — 블록 클릭 시 세로 드롭다운(직접 입력 불가, 라디오 선택만).
// WriterTypeSelect와 동일한 base-ui DropdownMenu 패턴. 트리거는 테마 그라디언트 블록.
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from '@/components/ui/dropdown-menu';

export type AccountRole = 'ADMIN' | 'STAFF' | 'EXCLUSIVE_WRITER' | 'GENERAL_WRITER';

const ROLE_ITEMS: { value: AccountRole; label: string }[] = [
  { value: 'ADMIN', label: '👑 관리자' },
  { value: 'STAFF', label: '💼 직원' },
  { value: 'EXCLUSIVE_WRITER', label: '✍️ 전속 작가' },
  { value: 'GENERAL_WRITER', label: '📝 일반 작가' },
];

function roleLabel(role: AccountRole | null): string {
  const found = ROLE_ITEMS.find((r) => r.value === role);
  return found ? found.label : '미지정';
}

export function RoleSelect({
  value,
  disabled,
  onChange,
}: {
  value: AccountRole | null;
  disabled?: boolean;
  onChange: (role: AccountRole) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={disabled}
        title="역할 변경"
        className="inline-flex items-center justify-center gap-1.5 min-w-[7.5rem] px-3 py-1.5 rounded-lg text-sm text-foreground border border-primary/30 bg-gradient-to-br from-primary/25 via-primary/10 to-transparent hover:border-primary transition cursor-pointer disabled:opacity-50"
      >
        {roleLabel(value)}
        <span className="text-[10px] opacity-70" aria-hidden="true">▾</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center" className="min-w-[8rem] bg-card border border-border">
        <DropdownMenuRadioGroup value={value ?? ''} onValueChange={(v) => onChange(String(v) as AccountRole)}>
          {ROLE_ITEMS.map((it) => (
            <DropdownMenuRadioItem key={it.value} value={it.value} className="text-foreground cursor-pointer">
              {it.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

- [ ] **Step 2: accounts 페이지 — import + AccountUser 타입 확장** — 현재 1~15행

변경 전:
```tsx
import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { useTableSort } from '@/hooks/useTableSort';
import { SortableHeader } from '@/components/ui/SortableHeader';

interface AccountUser {
  id: string;
  user_id: string;
  name: string | null;
  role: 'ADMIN' | 'STAFF' | 'EXCLUSIVE_WRITER' | 'GENERAL_WRITER' | null;
  created_at: string;
}
```
변경 후:
```tsx
import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { useTableSort } from '@/hooks/useTableSort';
import { SortableHeader } from '@/components/ui/SortableHeader';
import { EmailCell } from '@/components/admin/EmailCell';
import { RoleSelect, type AccountRole } from '@/components/admin/RoleSelect';
import { UserDetailModal } from '@/components/admin/UserDetailModal';
import type { AdminUser } from '@/lib/admin/userMerge';

type AccountUser = AdminUser & {
  role: AccountRole | null;
};
```

> `AdminUser`는 `email`·`last_sign_in_at`·`provider`·`avatar_url`·`contract_date`를 포함한다. `role`만 `AccountRole` 유니온으로 좁힌다.

- [ ] **Step 3: handleChangeRole 시그니처를 AccountRole로** — 현재 201~221행의 첫 줄

변경 전:
```tsx
  const handleChangeRole = useCallback(async (
    userId: string,
    newRole: 'ADMIN' | 'STAFF' | 'EXCLUSIVE_WRITER' | 'GENERAL_WRITER'
  ) => {
```
변경 후:
```tsx
  const handleChangeRole = useCallback(async (
    userId: string,
    newRole: AccountRole
  ) => {
```

- [ ] **Step 4: UserIdCell 정의 삭제** — 현재 141~169행의 `// 사용자 ID 셀 …`부터 `UserIdCell` 함수 전체 삭제.

- [ ] **Step 5: 헤더 교체(이메일) + 역할 변경 셀을 RoleSelect로** — 현재 299행(헤더), 315~317행(이메일 셀), 326~343행(역할 변경 셀)

헤더(299행) 변경 전:
```tsx
                  <th className="px-6 py-3 text-left font-bold text-foreground text-xs uppercase">사용자 ID</th>
```
헤더 변경 후:
```tsx
                  <th className="px-6 py-3 text-left font-bold text-foreground text-xs uppercase">이메일</th>
```

이메일 셀(315~317행) 변경 전:
```tsx
                    <td className="px-6 py-4">
                      <UserIdCell userId={u.user_id} onCopy={handleCopy} />
                    </td>
```
이메일 셀 변경 후:
```tsx
                    <td className="px-6 py-4">
                      <EmailCell email={u.email} onCopy={handleCopy} />
                    </td>
```

역할 변경 셀(326~343행) 변경 전:
```tsx
                    <td className="px-6 py-4">
                      <div className="flex gap-1 flex-wrap">
                        {ROLE_OPTIONS.map((role) => (
                          <button
                            key={role}
                            onClick={() => handleChangeRole(u.user_id, role)}
                            disabled={changingUserId === u.user_id}
                            className={`px-2 py-1 rounded text-xs font-medium transition disabled:opacity-50 cursor-pointer ${
                              u.role === role
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-border text-muted-foreground hover:bg-primary/20'
                            }`}
                          >
                            {roleButtonLabel(role)}
                          </button>
                        ))}
                      </div>
                    </td>
```
역할 변경 셀 변경 후:
```tsx
                    <td className="px-6 py-4">
                      <RoleSelect
                        value={u.role}
                        disabled={changingUserId === u.user_id}
                        onChange={(role) => handleChangeRole(u.user_id, role)}
                      />
                    </td>
```

> 이 변경으로 `ROLE_OPTIONS`(17행)와 `roleButtonLabel`(32~40행)이 미사용이 될 수 있다. `roleButtonLabel`은 `tabLabel`(43행)에서 여전히 사용하므로 유지. `ROLE_OPTIONS`는 다른 사용처가 없으면 삭제(미사용 린트 방지). → 17행 `const ROLE_OPTIONS = [...] as const;` 줄 삭제.

- [ ] **Step 6: 타입·린트(모달 미구현이라 import 오류 예상 — Task 5에서 해소)**

Run: `npx eslint src/components/admin/RoleSelect.tsx`
Expected: 출력 없음. (accounts 페이지의 `UserDetailModal` import는 Task 5에서 컴포넌트 생성 후 통과)

- [ ] **Step 7: 커밋(사용자 지시 시) — Task 5와 함께 검증 후**

(accounts 페이지는 Task 5의 모달까지 있어야 빌드되므로, 커밋은 Task 5 완료 후 함께)

---

## Task 5: 상세정보 모달 + 관리자용 페이지 상세정보 컬럼

**Files:**
- Create: `src/components/admin/UserDetailModal.tsx`
- Modify: `src/app/(dashboard)/admin/accounts/page.tsx`

**Interfaces:**
- Consumes: `AdminUser` (Task 1).
- Produces: `UserDetailModal({ user: AdminUser; onClose: () => void })`

- [ ] **Step 1: 모달 컴포넌트 작성** — `src/components/admin/UserDetailModal.tsx`

```tsx
'use client';

// [정보확인] 프로필 모달 — 관리자가 사용자의 프로필 정보를 본다(읽기전용).
import type { ReactNode } from 'react';
import type { AdminUser } from '@/lib/admin/userMerge';

function roleText(role: string | null): string {
  switch (role) {
    case 'ADMIN': return '👑 관리자';
    case 'STAFF': return '💼 직원';
    case 'EXCLUSIVE_WRITER': return '✍️ 전속 작가';
    case 'GENERAL_WRITER': return '📝 일반 작가';
    default: return '미지정';
  }
}

function providerText(p: string | null): string {
  if (!p) return '-';
  if (p === 'google') return '구글';
  return p;
}

function fmtDate(s: string | null): string {
  return s ? new Date(s).toLocaleDateString('ko-KR') : '-';
}

function fmtDateTime(s: string | null): string {
  return s ? new Date(s).toLocaleString('ko-KR') : '-';
}

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-2 border-b border-border/60 last:border-0">
      <span className="text-xs text-muted-foreground flex-shrink-0">{label}</span>
      <span className="text-sm text-foreground text-right break-all">{value}</span>
    </div>
  );
}

export function UserDetailModal({ user, onClose }: { user: AdminUser; onClose: () => void }) {
  const initial = (user.name ?? user.email ?? '?').charAt(0).toUpperCase();
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="bg-card border border-border rounded-xl shadow-xl w-[420px] max-w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더: 아바타 + 이름 + 이메일 */}
        <div className="flex items-center gap-3 mb-5">
          {user.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.avatar_url} alt="" className="w-12 h-12 rounded-full object-cover" />
          ) : (
            <div className="w-12 h-12 rounded-full bg-primary/20 text-primary flex items-center justify-center text-lg font-bold">
              {initial}
            </div>
          )}
          <div className="min-w-0">
            <p className="text-base font-semibold text-foreground truncate">{user.name ?? '미등록'}</p>
            <p className="text-xs text-muted-foreground truncate">{user.email ?? '-'}</p>
          </div>
        </div>

        {/* 상세 필드 */}
        <div>
          <Row label="역할" value={roleText(user.role)} />
          <Row label="이메일" value={user.email ?? '-'} />
          <Row label="사용자 ID" value={<span className="font-mono text-xs">{user.user_id}</span>} />
          <Row label="가입일" value={fmtDate(user.created_at)} />
          <Row label="계약일" value={fmtDate(user.contract_date)} />
          <Row label="마지막 로그인" value={fmtDateTime(user.last_sign_in_at)} />
          <Row label="로그인 방식" value={providerText(user.provider)} />
        </div>

        <button
          onClick={onClose}
          className="mt-6 w-full px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition cursor-pointer"
        >
          닫기
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: accounts 페이지 — 상세정보 상태 추가** — 현재 178~179행(`changingUserId`/`copyToast` 선언 부근)

변경 전:
```tsx
  const [changingUserId, setChangingUserId] = useState<string | null>(null);
  const [copyToast, setCopyToast] = useState(false);
```
변경 후:
```tsx
  const [changingUserId, setChangingUserId] = useState<string | null>(null);
  const [copyToast, setCopyToast] = useState(false);
  const [detailUser, setDetailUser] = useState<AccountUser | null>(null);
```

- [ ] **Step 3: 헤더에 상세정보 컬럼 추가** — 역할 변경 헤더(현재 302행) 바로 뒤

변경 전:
```tsx
                  <th className="px-6 py-3 text-left font-bold text-foreground text-xs uppercase">역할 변경</th>
                </tr>
```
변경 후:
```tsx
                  <th className="px-6 py-3 text-left font-bold text-foreground text-xs uppercase">역할 변경</th>
                  <th className="px-6 py-3 text-left font-bold text-foreground text-xs uppercase">상세정보</th>
                </tr>
```

- [ ] **Step 4: 본문에 상세정보 셀 추가** — 역할 변경 셀(Task 4 Step 5에서 교체한 `RoleSelect` 셀) 바로 뒤(닫는 `</tr>` 직전)

추가:
```tsx
                    <td className="px-6 py-4">
                      <button
                        onClick={() => setDetailUser(u)}
                        className="px-3 py-1.5 text-xs font-medium rounded-lg border border-border text-foreground hover:bg-primary/10 hover:border-primary transition cursor-pointer"
                      >
                        정보확인
                      </button>
                    </td>
```

- [ ] **Step 5: 모달 렌더** — 복사 토스트 블록(현재 353~357행) 바로 앞에 추가

```tsx
      {detailUser && (
        <UserDetailModal user={detailUser} onClose={() => setDetailUser(null)} />
      )}

```

- [ ] **Step 6: 타입·린트**

Run: `npm run type-check && npx eslint "src/app/(dashboard)/admin/accounts/page.tsx" src/components/admin/UserDetailModal.tsx`
Expected: 출력 없음(에러 0)

- [ ] **Step 7: 커밋(사용자 지시 시) — Task 4·5 함께**

```bash
git add src/components/admin/RoleSelect.tsx src/components/admin/UserDetailModal.tsx "src/app/(dashboard)/admin/accounts/page.tsx"
git commit -m "Feat: 관리자용 역할 세로 드롭다운 + 상세정보 모달 + 이메일 컬럼"
```

---

## Task 6: 통합 검증

**Files:** (변경 없음 — 전체 검증)

- [ ] **Step 1: 정적 검사 + 단위테스트**

Run:
```bash
npm run type-check
npx eslint src/
npx vitest run
```
Expected: type-check 0 / eslint 0 errors(기존 img 경고 무관) / vitest 전체 통과(userMerge 포함).

- [ ] **Step 2: 빌드**

Run: `npm run build`
Expected: 성공.

- [ ] **Step 3: Playwright(인증·ADMIN, 포트 3001)**

1. **구성원 페이지(`/staff`)**: 컬럼이 `이름 | 이메일 | 역할 | 등록일`. "이메일" 컬럼에 `@prism-filter.com` 이메일 표시. (이전 `사용자 ID` UUID 아님)
2. **관리자용 페이지(`/admin/accounts`)**:
   - 컬럼이 `이름 | 이메일 | 현재 역할 | 등록일 | 역할 변경 | 상세정보`.
   - "역할 변경"이 **단일 그라디언트 블록**(검은색 아님)이고, 클릭 시 **세로 드롭다운** 4개 역할 노출. 직접 입력란 없음.
   - 역할 선택 → PATCH 후 "현재 역할" 갱신.
   - "상세정보"의 **[정보확인]** 클릭 → 모달에 이름·이메일·역할·사용자 ID·가입일·계약일·마지막 로그인·로그인 방식 표시. 닫기 동작.
3. 콘솔 에러 0.
> 검증으로 바꾼 역할은 원래 값으로 되돌릴 것.

- [ ] **Step 4: 커밋(사용자 지시 시)** — 잔여 정리 커밋.

---

## Self-Review

**1. Spec coverage**
- 사용자 ID→이메일 (관리자용+구성원) → Task 1(API 이메일) + Task 2(EmailCell) + Task 3(구성원) + Task 4 Step 5(관리자용). ✓
- 관리자 권한일 때 역할 변경 우측 상세정보 컬럼 → Task 5(관리자용 페이지는 ADMIN 전용이라 관리자만 노출). ✓
- [정보확인] → 프로필 모달 → Task 5 `UserDetailModal`. ✓
- 역할 선택 세로 드롭다운(블록 클릭) → Task 4 `RoleSelect`. ✓
- 블록 8~10자(`min-w-[7.5rem]`)·검은색 금지·테마 그라디언트(`from-primary/25 via-primary/10`)·직접 입력 불가(라디오) → Task 4. ✓

**2. Placeholder scan** — 모든 코드 스텝에 실제 코드/명령/기대출력. "TODO/적절히" 없음. ✓

**3. Type consistency**
- `AdminUser`(Task 1) = accounts `AccountUser`(extends, Task 4) = `UserDetailModal` prop(Task 5). ✓
- `AccountRole`(Task 4) = `handleChangeRole`/`RoleSelect.onChange`(Task 4) 일치. ✓
- `EmailCell({email, onCopy})`(Task 2) = staff/accounts 호출(Task 3/4) 일치. ✓
- API 응답 `users: AdminUser[]` = 두 페이지 fetch 형변환과 일치. ✓

**알려진 한계(문서화):** `/api/admin/users`는 ADMIN 전용(`requireStaff(true)`)이라 STAFF의 구성원 페이지 데이터 접근 제약은 기존과 동일(본 작업 범위 밖). 상세정보/역할 드롭다운은 역할 변경 컬럼이 있는 관리자용 페이지에만 추가(구성원 페이지는 역할 읽기전용이라 미적용).

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-06-18-member-email-role-select-detail.md`. Two execution options:

1. **Subagent-Driven (recommended)** — 태스크마다 새 서브에이전트 디스패치, 태스크 사이 리뷰.
2. **Inline Execution** — 이 세션에서 executing-plans로 체크포인트 배치 실행.

Which approach?
