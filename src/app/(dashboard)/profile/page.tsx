'use client';

import { useState, useCallback } from 'react';
import { useAuthStore } from '@/store/authStore';
import { UserRole } from '@/types';
import Link from 'next/link';

// 본인이 직접 설정 가능한 역할은 작가 역할로만 제한 (권한 상승 방지)
// 직원·관리자 역할은 관리자가 계정 관리에서만 부여한다.
const ROLE_OPTIONS: { value: UserRole; label: string; icon: string }[] = [
  { value: 'EXCLUSIVE_WRITER', label: '전속 작가', icon: '✍️' },
  { value: 'GENERAL_WRITER',   label: '일반 작가', icon: '📝' },
];

function getRoleLabel(role: UserRole | null | undefined) {
  switch (role) {
    case 'ADMIN':            return '👑 관리자';
    case 'STAFF':            return '💼 직원';
    case 'EXCLUSIVE_WRITER': return '✍️ 전속 작가';
    case 'GENERAL_WRITER':   return '📝 일반 작가';
    default: return '미지정';
  }
}

export default function ProfilePage() {
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole>('EXCLUSIVE_WRITER');
  const [showUserId, setShowUserId] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  // 직원·관리자는 본인 역할을 직접 변경할 수 없음 (강등·권한 상승 방지)
  const isPrivileged = user?.role === 'ADMIN' || user?.role === 'STAFF';

  const handleEditStart = useCallback(() => {
    setEditName(user?.name ?? '');
    setSelectedRole(user?.role ?? 'EXCLUSIVE_WRITER');
    setSaveError('');
    setSaveSuccess(false);
    setIsEditing(true);
  }, [user?.name, user?.role]);

  const handleCancel = useCallback(() => {
    setIsEditing(false);
    setSaveError('');
  }, []);

  const handleSave = useCallback(async () => {
    if (!user) return;
    setIsSaving(true);
    setSaveError('');

    try {
      // 직원·관리자는 역할 변경 불가 — 이름만 전송
      const payload = isPrivileged
        ? { name: editName.trim() || null }
        : { name: editName.trim() || null, role: selectedRole };

      const res = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || '저장 중 오류가 발생했습니다.');
      }

      setUser({
        ...user,
        name: editName.trim() || null,
        role: isPrivileged ? user.role : selectedRole,
      });
      setSaveSuccess(true);
      setIsEditing(false);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : '저장 중 오류가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
  }, [user, editName, selectedRole, setUser, isPrivileged]);

  const maskedId = user?.id
    ? user.id.substring(0, 8) + '••••••••••••••••••••••••'
    : '정보 없음';

  if (!user) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">로그인 정보를 불러올 수 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">내 프로필 설정</h1>
        <p className="text-sm text-muted-foreground">계정 정보 및 설정을 관리합니다.</p>
      </div>

      {saveSuccess && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-lg px-4 py-3 text-sm text-green-400">
          ✅ 프로필이 성공적으로 저장되었습니다.
        </div>
      )}

      {/* 계정 정보 카드 */}
      <div className="bg-card border border-border rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-foreground">계정 정보</h2>
          {!isEditing ? (
            <button
              onClick={handleEditStart}
              className="px-4 py-1.5 text-sm border border-border rounded-lg text-foreground hover:bg-blue-600/10 transition"
            >
              ✏️ 수정하기
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={handleCancel}
                disabled={isSaving}
                className="px-4 py-1.5 text-sm border border-border rounded-lg text-muted-foreground hover:bg-blue-600/10 transition disabled:opacity-50"
              >
                취소
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-4 py-1.5 text-sm bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition disabled:opacity-50"
              >
                {isSaving ? '저장 중...' : '저장'}
              </button>
            </div>
          )}
        </div>

        <div className="space-y-6">
          {/* 이름 */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              이름
            </label>
            {!isEditing ? (
              <p className="mt-1.5 text-foreground">
                {user.name ? user.name : (
                  <span className="text-muted-foreground italic">미등록</span>
                )}
              </p>
            ) : (
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="이름을 입력하세요"
                className="mt-1.5 w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground placeholder-muted-foreground outline-none focus:ring-2 focus:ring-primary/50"
              />
            )}
          </div>

          {/* 이메일 (수정 불가) */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              이메일
            </label>
            <div className="mt-1.5 flex items-center gap-2">
              <p className="text-foreground">{user.email}</p>
              {isEditing && (
                <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                  수정 불가
                </span>
              )}
            </div>
          </div>

          {/* 역할 */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              역할
            </label>
            {!isEditing || isPrivileged ? (
              <div className="mt-1.5">
                <p className="text-foreground">
                  {user.role === null || user.role === undefined ? (
                    <span className="text-muted-foreground italic">미지정</span>
                  ) : (
                    getRoleLabel(user.role)
                  )}
                </p>
                {isEditing && isPrivileged && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    직원·관리자 역할은 직접 변경할 수 없습니다. 관리자에게 문의하세요.
                  </p>
                )}
              </div>
            ) : (
              <div className="mt-2 flex flex-wrap gap-2">
                {ROLE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setSelectedRole(opt.value)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm border transition ${
                      selectedRole === opt.value
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'border-border text-foreground hover:bg-blue-600/10'
                    }`}
                  >
                    {opt.icon} {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 사용자 ID (눈 토글) */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              사용자 ID
            </label>
            <div className="mt-1.5 flex items-center gap-2">
              <p className="text-foreground font-mono text-sm">
                {showUserId ? (user.id || '정보 없음') : maskedId}
              </p>
              <button
                onClick={() => setShowUserId((v) => !v)}
                className="text-muted-foreground hover:text-foreground transition p-1 rounded-md hover:bg-blue-600/10"
                title={showUserId ? 'ID 숨기기' : 'ID 표시'}
              >
                {showUserId ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/>
                    <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/>
                    <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/>
                    <line x1="2" x2="22" y1="2" y2="22"/>
                  </svg>
                )}
              </button>
              {isEditing && (
                <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                  수정 불가
                </span>
              )}
            </div>
          </div>

          {saveError && (
            <p className="text-sm text-red-400">⚠️ {saveError}</p>
          )}
        </div>
      </div>

      {/* 보안 설정 카드 */}
      <div className="bg-card border border-border rounded-lg p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">보안 설정</h2>
        <div className="flex gap-3 p-4 bg-blue-500/5 border border-blue-500/20 rounded-lg">
          <span className="text-xl flex-shrink-0 mt-0.5">🔐</span>
          <div className="space-y-1.5">
            <p className="text-sm font-medium text-foreground">구글 계정과 연동되어 있습니다</p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              비밀번호 변경, 2단계 인증 등 보안 관련 설정은 구글 비즈니스 계정과 연동되어 있으므로
              구글 계정 설정에서 이용하시기 바랍니다.
            </p>
            <a
              href="https://myaccount.google.com/security"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-primary hover:underline pt-1"
            >
              구글 계정 보안 설정으로 이동 →
            </a>
          </div>
        </div>
      </div>

      <div>
        <Link
          href="/"
          className="px-4 py-2 bg-border hover:bg-border/80 text-foreground rounded-lg text-sm font-medium transition inline-block"
        >
          ← 뒤로가기
        </Link>
      </div>
    </div>
  );
}
