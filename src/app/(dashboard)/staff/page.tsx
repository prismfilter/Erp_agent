'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useTableSort } from '@/hooks/useTableSort';
import { SortableHeader } from '@/components/ui/SortableHeader';
import { useAuthStore } from '@/store/authStore';

type MemberRole = 'ADMIN' | 'STAFF' | 'EXCLUSIVE_WRITER' | 'GENERAL_WRITER';

interface Member {
  id: string;
  user_id: string;
  name: string | null;
  role: MemberRole;
  contract_date: string | null;
  created_at: string;
}

type MemberTab = '전체' | MemberRole;

const MEMBER_ROLES: MemberRole[] = ['ADMIN', 'STAFF', 'EXCLUSIVE_WRITER', 'GENERAL_WRITER'];
const WRITER_ROLES: MemberRole[] = ['EXCLUSIVE_WRITER', 'GENERAL_WRITER'];

function roleLabel(role: string) {
  switch (role) {
    case 'ADMIN':            return '👑 관리자';
    case 'STAFF':            return '💼 직원';
    case 'EXCLUSIVE_WRITER': return '✍️ 전속 작가';
    case 'GENERAL_WRITER':   return '📝 일반 작가';
    default:                 return role;
  }
}

function tabLabel(tab: MemberTab) {
  switch (tab) {
    case '전체':             return '전체';
    case 'ADMIN':            return '관리자';
    case 'STAFF':            return '직원';
    case 'EXCLUSIVE_WRITER': return '전속 작가';
    case 'GENERAL_WRITER':   return '일반 작가';
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
        <button onClick={handleSave} disabled={saving} className="p-1 text-green-400 hover:text-green-300 transition disabled:opacity-50" title="저장">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </button>
        <button onClick={handleCancel} className="p-1 text-red-400 hover:text-red-300 transition" title="취소">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
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

// 사용자 ID 셀 — 전체 ID 표시(title)와 복사는 관리자만
function UserIdCell({ userId, onCopy, isAdmin }: { userId: string; onCopy: (id: string) => void; isAdmin: boolean }) {
  return (
    <div className="flex items-center gap-1.5 group">
      <span className="text-foreground font-mono text-xs cursor-default" title={isAdmin ? userId : undefined}>
        {userId.substring(0, 8)}...
      </span>
      {isAdmin && (
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
      )}
    </div>
  );
}

// 계약일 인라인 편집 셀 (작가에게 의미 있음)
function ContractDateCell({
  userId,
  currentDate,
  onSaved,
}: {
  userId: string;
  currentDate: string | null;
  onSaved: (userId: string, date: string | null) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(currentDate ?? '');
  const [saving, setSaving] = useState(false);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contract_date: value || null }),
      });
      if (!res.ok) throw new Error();
      onSaved(userId, value || null);
      setIsEditing(false);
    } catch {
      // 저장 실패 시 입력값 유지
    } finally {
      setSaving(false);
    }
  }, [userId, value, onSaved]);

  const handleCancel = useCallback(() => {
    setValue(currentDate ?? '');
    setIsEditing(false);
  }, [currentDate]);

  if (isEditing) {
    return (
      <div className="flex items-center gap-1">
        <input
          type="date"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSave();
            if (e.key === 'Escape') handleCancel();
          }}
          autoFocus
          className="px-2 py-1 text-xs bg-background border border-primary rounded outline-none text-foreground"
        />
        <button onClick={handleSave} disabled={saving} className="p-1 text-green-400 hover:text-green-300 transition disabled:opacity-50" title="저장">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </button>
        <button onClick={handleCancel} className="p-1 text-red-400 hover:text-red-300 transition" title="취소">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 group">
      <span className={currentDate ? 'text-foreground text-xs' : 'text-muted-foreground italic text-xs'}>
        {currentDate ? new Date(currentDate).toLocaleDateString('ko-KR') : '미등록'}
      </span>
      <button
        onClick={() => { setValue(currentDate ?? ''); setIsEditing(true); }}
        className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-foreground transition rounded hover:bg-blue-600/10"
        title="계약일 수정"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
        </svg>
      </button>
    </div>
  );
}

export default function StaffPage() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN';
  const [members, setMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState<MemberTab>('전체');
  const [copyToast, setCopyToast] = useState(false);

  const fetchMembers = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/users');
      if (!res.ok) throw new Error('목록을 불러올 수 없습니다.');
      const data = await res.json();
      const allUsers = data.users || [];
      setMembers(
        allUsers.filter((u: { role: string }) =>
          (MEMBER_ROLES as string[]).includes(u.role)
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- async fetch라 setState는 마이크로태스크에서 실행 (동기 cascading render 아님)
  useEffect(() => { fetchMembers(); }, [fetchMembers]);

  const handleNameSaved = useCallback((userId: string, name: string | null) => {
    setMembers((prev) => prev.map((m) => m.user_id === userId ? { ...m, name } : m));
  }, []);

  const handleContractDateSaved = useCallback((userId: string, date: string | null) => {
    setMembers((prev) => prev.map((m) => m.user_id === userId ? { ...m, contract_date: date } : m));
  }, []);

  const handleCopy = useCallback((id: string) => {
    navigator.clipboard.writeText(id);
    setCopyToast(true);
    setTimeout(() => setCopyToast(false), 2000);
  }, []);

  // 정렬: 이름·역할·등록일·계약일
  const { sortKey, dir, toggle, sortRows } = useTableSort<Member>({
    name: (m) => m.name,
    role: (m) => m.role,
    created_at: (m) => m.created_at,
    contract_date: (m) => m.contract_date,
  }, 'pf_sort_staff');

  const filtered = useMemo(() => {
    const base = selectedTab === '전체'
      ? members
      : members.filter((m) => m.role === selectedTab);
    return sortRows(base);
  }, [members, selectedTab, sortRows]);

  const tabCount = (tab: MemberTab) =>
    tab === '전체' ? members.length : members.filter((m) => m.role === tab).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">구성원</h1>
        <p className="text-muted-foreground text-sm">관리자 · 직원 · 전속/일반 작가 전체 목록</p>
      </div>

      {/* 탭 */}
      <div className="flex flex-wrap gap-2 border-b border-border">
        {(['전체', ...MEMBER_ROLES] as MemberTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setSelectedTab(tab)}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition cursor-pointer whitespace-nowrap ${
              selectedTab === tab
                ? 'border-b-primary text-primary'
                : 'border-b-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {`${tabLabel(tab)} (${tabCount(tab)})`}
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
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-muted-foreground">등록된 구성원이 없습니다.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-primary/10 border-b border-border">
                <tr>
                  <SortableHeader label="이름" sortKey="name" activeKey={sortKey} dir={dir} onSort={toggle} className="px-6 py-3 text-xs uppercase" />
                  <th className="px-6 py-3 text-left font-bold text-foreground text-xs uppercase">사용자 ID</th>
                  <SortableHeader label="역할" sortKey="role" activeKey={sortKey} dir={dir} onSort={toggle} className="px-6 py-3 text-xs uppercase" />
                  <SortableHeader label="등록일" sortKey="created_at" activeKey={sortKey} dir={dir} onSort={toggle} className="px-6 py-3 text-xs uppercase" />
                  <SortableHeader label="계약일" sortKey="contract_date" activeKey={sortKey} dir={dir} onSort={toggle} className="px-6 py-3 text-xs uppercase" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((m) => (
                  <tr key={m.id} className="hover:bg-primary/5">
                    <td className="px-6 py-4">
                      <NameCell userId={m.user_id} currentName={m.name} onSaved={handleNameSaved} />
                    </td>
                    <td className="px-6 py-4">
                      <UserIdCell userId={m.user_id} onCopy={handleCopy} isAdmin={isAdmin} />
                    </td>
                    <td className="px-6 py-4">
                      <span className="bg-blue-500/20 text-blue-400 px-3 py-1 rounded text-xs font-medium">
                        {roleLabel(m.role)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground text-xs">
                      {new Date(m.created_at).toLocaleDateString('ko-KR')}
                    </td>
                    <td className="px-6 py-4">
                      {WRITER_ROLES.includes(m.role) ? (
                        <ContractDateCell
                          userId={m.user_id}
                          currentDate={m.contract_date}
                          onSaved={handleContractDateSaved}
                        />
                      ) : (
                        <span className="text-muted-foreground text-xs">-</span>
                      )}
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
