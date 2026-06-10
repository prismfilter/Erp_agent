'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';

interface AccountUser {
  id: string;
  user_id: string;
  name: string | null;
  role: 'ADMIN' | 'STAFF' | 'WRITER' | null;
  created_at: string;
}

const ROLE_OPTIONS = ['ADMIN', 'STAFF', 'WRITER'] as const;

function roleLabel(role: string | null) {
  switch (role) {
    case 'ADMIN': return '👑 관리자';
    case 'STAFF': return '💼 직원';
    case 'WRITER': return '✍️ 작가';
    default: return '미지정';
  }
}

// 이름 인라인 편집 셀
function NameCell({
  userId,
  currentName,
  onSaved,
}: {
  userId: string;
  currentName: string | null;
  onSaved: (userId: string, name: string | null) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(currentName ?? '');
  const [saving, setSaving] = useState(false);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: value.trim() || null }),
      });
      if (!res.ok) throw new Error();
      onSaved(userId, value.trim() || null);
      setIsEditing(false);
    } catch {
      // 저장 실패 시 조용히 무시 (입력값 유지)
    } finally {
      setSaving(false);
    }
  }, [userId, value, onSaved]);

  const handleCancel = useCallback(() => {
    setValue(currentName ?? '');
    setIsEditing(false);
  }, [currentName]);

  if (isEditing) {
    return (
      <div className="flex items-center gap-1">
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSave();
            if (e.key === 'Escape') handleCancel();
          }}
          autoFocus
          className="w-24 px-2 py-1 text-xs bg-background border border-primary rounded outline-none text-foreground"
          placeholder="이름 입력"
        />
        {/* 저장 (체크) */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="p-1 text-green-400 hover:text-green-300 transition disabled:opacity-50"
          title="저장"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </button>
        {/* 취소 (X) */}
        <button
          onClick={handleCancel}
          className="p-1 text-red-400 hover:text-red-300 transition"
          title="취소"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 group">
      <span className={currentName ? 'text-foreground' : 'text-muted-foreground italic text-xs'}>
        {currentName ?? '미등록'}
      </span>
      {/* 연필 아이콘 */}
      <button
        onClick={() => { setValue(currentName ?? ''); setIsEditing(true); }}
        className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-foreground transition rounded hover:bg-blue-600/10"
        title="이름 수정"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
        </svg>
      </button>
    </div>
  );
}

export default function AccountsPage() {
  const router = useRouter();
  const { isAdmin } = useAuthStore();
  const [users, setUsers] = useState<AccountUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<'전체' | 'ADMIN' | 'STAFF' | 'WRITER'>('전체');
  const [changingUserId, setChangingUserId] = useState<string | null>(null);

  useEffect(() => {
    if (!isAdmin()) router.push('/');
  }, [isAdmin, router]);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/users');
      if (!res.ok) throw new Error('사용자 목록을 불러올 수 없습니다.');
      const data = await res.json();
      setUsers(data.users || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleChangeRole = useCallback(async (
    userId: string,
    newRole: 'ADMIN' | 'STAFF' | 'WRITER'
  ) => {
    setChangingUserId(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });
      if (!res.ok) throw new Error();
      setUsers((prev) =>
        prev.map((u) => u.user_id === userId ? { ...u, role: newRole } : u)
      );
    } catch {
      setError('역할 변경에 실패했습니다.');
    } finally {
      setChangingUserId(null);
    }
  }, []);

  const handleNameSaved = useCallback((userId: string, name: string | null) => {
    setUsers((prev) =>
      prev.map((u) => u.user_id === userId ? { ...u, name } : u)
    );
  }, []);

  const filteredUsers = selectedRole === '전체'
    ? users
    : users.filter((u) => u.role === selectedRole);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">계정 관리</h1>
          <p className="text-muted-foreground text-sm">사용자 역할 및 이름 관리</p>
        </div>
      </div>

      {/* 역할 탭 */}
      <div className="flex gap-2 border-b border-border">
        {(['전체', 'ADMIN', 'STAFF', 'WRITER'] as const).map((role) => (
          <button
            key={role}
            onClick={() => setSelectedRole(role)}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition cursor-pointer ${
              selectedRole === role
                ? 'border-b-primary text-primary'
                : 'border-b-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {role === '전체'
              ? `전체 (${users.length})`
              : `${role} (${users.filter((u) => u.role === role).length})`}
          </button>
        ))}
      </div>

      {/* 테이블 */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-border border-t-primary mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">데이터 로딩 중...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center">
            <p className="text-red-400">오류: {error}</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-muted-foreground">등록된 사용자가 없습니다.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-primary/10 border-b border-border">
                <tr>
                  <th className="px-6 py-3 text-left font-semibold text-foreground text-xs uppercase">이름</th>
                  <th className="px-6 py-3 text-left font-semibold text-foreground text-xs uppercase">사용자 ID</th>
                  <th className="px-6 py-3 text-left font-semibold text-foreground text-xs uppercase">현재 역할</th>
                  <th className="px-6 py-3 text-left font-semibold text-foreground text-xs uppercase">등록일</th>
                  <th className="px-6 py-3 text-left font-semibold text-foreground text-xs uppercase">역할 변경</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-primary/5">
                    {/* 이름 (인라인 편집) */}
                    <td className="px-6 py-4">
                      <NameCell
                        userId={u.user_id}
                        currentName={u.name}
                        onSaved={handleNameSaved}
                      />
                    </td>
                    {/* 사용자 ID */}
                    <td className="px-6 py-4 text-foreground font-mono text-xs">
                      {u.user_id.substring(0, 8)}...
                    </td>
                    {/* 현재 역할 */}
                    <td className="px-6 py-4">
                      <span className="bg-blue-500/20 text-blue-400 px-3 py-1 rounded text-xs font-medium">
                        {roleLabel(u.role)}
                      </span>
                    </td>
                    {/* 등록일 */}
                    <td className="px-6 py-4 text-muted-foreground text-xs">
                      {new Date(u.created_at).toLocaleDateString('ko-KR')}
                    </td>
                    {/* 역할 변경 버튼 */}
                    <td className="px-6 py-4">
                      <div className="flex gap-1">
                        {ROLE_OPTIONS.map((role) => (
                          <button
                            key={role}
                            onClick={() => handleChangeRole(u.user_id, role)}
                            disabled={changingUserId === u.user_id}
                            className={`px-2 py-1 rounded text-xs font-medium transition disabled:opacity-50 ${
                              u.role === role
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-border text-muted-foreground hover:bg-primary/20'
                            }`}
                          >
                            {role}
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
