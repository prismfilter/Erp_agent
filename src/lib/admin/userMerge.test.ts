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
