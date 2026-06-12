import { describe, it, expect } from 'vitest';
import { canSelfAssignRole, SELF_ASSIGNABLE_ROLES } from './apiAuth';

describe('canSelfAssignRole (권한 상승 방지)', () => {
  it('미지정 사용자는 작가 역할로 온보딩할 수 있다', () => {
    expect(canSelfAssignRole(null, 'EXCLUSIVE_WRITER')).toBe(true);
    expect(canSelfAssignRole(null, 'GENERAL_WRITER')).toBe(true);
  });

  it('미지정 사용자도 STAFF/ADMIN 자가 승격은 차단된다', () => {
    expect(canSelfAssignRole(null, 'STAFF')).toBe(false);
    expect(canSelfAssignRole(null, 'ADMIN')).toBe(false);
  });

  it('작가가 STAFF/ADMIN으로 자가 승격할 수 없다', () => {
    expect(canSelfAssignRole('GENERAL_WRITER', 'STAFF')).toBe(false);
    expect(canSelfAssignRole('EXCLUSIVE_WRITER', 'ADMIN')).toBe(false);
  });

  it('작가 간 역할 변경은 허용된다', () => {
    expect(canSelfAssignRole('GENERAL_WRITER', 'EXCLUSIVE_WRITER')).toBe(true);
  });

  it('현재 역할과 동일하면 항상 허용된다 (no-op)', () => {
    expect(canSelfAssignRole('STAFF', 'STAFF')).toBe(true);
    expect(canSelfAssignRole('ADMIN', 'ADMIN')).toBe(true);
  });

  it('자가 지정 가능 역할은 작가 2종으로만 제한된다', () => {
    expect(SELF_ASSIGNABLE_ROLES).toEqual(['EXCLUSIVE_WRITER', 'GENERAL_WRITER']);
  });
});
