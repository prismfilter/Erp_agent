'use client';

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

const ROLE_OPTIONS = ['ADMIN', 'STAFF', 'EXCLUSIVE_WRITER', 'GENERAL_WRITER'] as const;

const TAB_OPTIONS = ['전체', 'ADMIN', 'STAFF', 'EXCLUSIVE_WRITER', 'GENERAL_WRITER'] as const;
type TabOption = typeof TAB_OPTIONS[number];

function roleLabel(role: string | null) {
  switch (role) {
    case 'ADMIN':            return '👑 관리자';
    case 'STAFF':            return '💼 직원';
    case 'EXCLUSIVE_WRITER': return '✍️ 전속 작가';
    case 'GENERAL_WRITER':   return '📝 일반 작가';
    default:                 return '미지정';
  }
}

function roleButtonLabel(role: string) {
  switch (role) {
    case 'ADMIN':            return '관리자';
    case 'STAFF':            return '직원';
    case 'EXCLUSIVE_WRITER': return '전속 작가';
    case 'GENERAL_WRITER':   return '일반 작가';
    default:                 return role;
  }
}

function tabLabel(tab: TabOption, count: number) {
  if (tab === '전체') return `전체 (${count})`;
  return `${roleButtonLabel(tab)} (${count})`;
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
      // 저장 실패 시 입력값 유지
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

// 사용자 ID 셀 (hover 전체 표시 + 클립보드 복사)
function UserIdCell({
  userId,
  onCopy,
}: {
  userId: string;
  onCopy: (id: string) => void;
}) {
  return (
    <div className="flex items-center gap-1.5 group">
      <span
        className="text-foreground font-mono text-xs cursor-default"
        title={userId}
      >
        {userId.substring(0, 8)}...
      </span>
      <button
        onClick={() => onCopy(userId)}
        className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-foreground transition rounded hover:bg-blue-600/10"
        title="ID 복사"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/>
          <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
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
  const [selectedTab, setSelectedTab] = useState<TabOption>('전체');
  const [changingUserId, setChangingUserId] = useState<string | null>(null);
  const [copyToast, setCopyToast] = useState(false);

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

  // eslint-disable-next-line react-hooks/set-state-in-effect -- async fetch라 setState는 마이크로태스크에서 실행 (동기 cascading render 아님)
  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleChangeRole = useCallback(async (
    userId: string,
    newRole: 'ADMIN' | 'STAFF' | 'EXCLUSIVE_WRITER' | 'GENERAL_WRITER'
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

  const handleCopy = useCallback((id: string) => {
    navigator.clipboard.writeText(id);
    setCopyToast(true);
    setTimeout(() => setCopyToast(false), 2000);
  }, []);

  // 정렬: 이름·현재 역할·등록일
  const { sortKey, dir, toggle, sortRows } = useTableSort<AccountUser>({
    name: (u) => u.name,
    role: (u) => u.role,
    created_at: (u) => u.created_at,
  }, 'pf_sort_accounts');

  const filteredUsers = useMemo(() => {
    const base = selectedTab === '전체'
      ? users
      : users.filter((u) => u.role === selectedTab);
    return sortRows(base);
  }, [users, selectedTab, sortRows]);

  const tabCount = (tab: TabOption) =>
    tab === '전체' ? users.length : users.filter((u) => u.role === tab).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">관리자용</h1>
          <p className="text-muted-foreground text-sm">사용자 역할 및 이름 관리</p>
        </div>
      </div>

      {/* 역할 탭 */}
      <div className="flex gap-2 border-b border-border overflow-x-auto">
        {TAB_OPTIONS.map((tab) => (
          <button
            key={tab}
            onClick={() => setSelectedTab(tab)}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition cursor-pointer whitespace-nowrap ${
              selectedTab === tab
                ? 'border-b-primary text-primary'
                : 'border-b-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {tabLabel(tab, tabCount(tab))}
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
                  <SortableHeader label="이름" sortKey="name" activeKey={sortKey} dir={dir} onSort={toggle} className="px-6 py-3 text-xs uppercase" />
                  <th className="px-6 py-3 text-left font-bold text-foreground text-xs uppercase">사용자 ID</th>
                  <SortableHeader label="현재 역할" sortKey="role" activeKey={sortKey} dir={dir} onSort={toggle} className="px-6 py-3 text-xs uppercase" />
                  <SortableHeader label="등록일" sortKey="created_at" activeKey={sortKey} dir={dir} onSort={toggle} className="px-6 py-3 text-xs uppercase" />
                  <th className="px-6 py-3 text-left font-bold text-foreground text-xs uppercase">역할 변경</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-primary/5">
                    <td className="px-6 py-4">
                      <NameCell
                        userId={u.user_id}
                        currentName={u.name}
                        onSaved={handleNameSaved}
                      />
                    </td>
                    <td className="px-6 py-4">
                      <UserIdCell userId={u.user_id} onCopy={handleCopy} />
                    </td>
                    <td className="px-6 py-4">
                      <span className="bg-blue-500/20 text-blue-400 px-3 py-1 rounded text-xs font-medium">
                        {roleLabel(u.role)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground text-xs">
                      {new Date(u.created_at).toLocaleDateString('ko-KR')}
                    </td>
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 복사 완료 토스트 */}
      {copyToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-foreground text-background text-sm px-4 py-2 rounded-full shadow-lg z-50 pointer-events-none">
          복사 완료
        </div>
      )}
    </div>
  );
}
