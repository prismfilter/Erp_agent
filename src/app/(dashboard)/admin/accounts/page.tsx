'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/store/authStore';

interface UserRole {
  id: string;
  user_id: string;
  role: 'ADMIN' | 'STAFF' | 'WRITER';
  created_at: string;
  email?: string;
}

export default function AccountsPage() {
  const router = useRouter();
  const { user, isAdmin } = useAuthStore();
  const [users, setUsers] = useState<UserRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<'전체' | 'ADMIN' | 'STAFF' | 'WRITER'>('전체');
  const [changingUserId, setChangingUserId] = useState<string | null>(null);

  useEffect(() => {
    if (!isAdmin) {
      router.push('/');
    }
  }, [isAdmin, router]);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const supabase = createClient();
        const { data, error: fetchError } = await supabase
          .from('user_roles')
          .select('*')
          .order('created_at', { ascending: false });

        if (fetchError) throw fetchError;
        setUsers(data || []);
      } catch (err) {
        console.error('사용자 목록 조회 오류:', err);
        setError(err instanceof Error ? err.message : '사용자 목록을 불러올 수 없습니다');
      } finally {
        setIsLoading(false);
      }
    };

    fetchUsers();
  }, []);

  const handleChangeRole = async (userId: string, newRole: 'ADMIN' | 'STAFF' | 'WRITER') => {
    try {
      setChangingUserId(userId);
      const supabase = createClient();

      const { error: updateError } = await supabase
        .from('user_roles')
        .update({ role: newRole })
        .eq('user_id', userId);

      if (updateError) throw updateError;

      const { data, error: fetchError } = await supabase
        .from('user_roles')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setUsers(data || []);
    } catch (err) {
      console.error('역할 변경 오류:', err);
      setError(err instanceof Error ? err.message : '역할 변경에 실패했습니다');
    } finally {
      setChangingUserId(null);
    }
  };

  const filteredUsers = selectedRole === '전체'
    ? users
    : users.filter(u => u.role === selectedRole);

  const roleLabel = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return '👑 관리자';
      case 'STAFF':
        return '💼 직원';
      case 'WRITER':
        return '✍️ 작가';
      default:
        return role;
    }
  };

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[var(--color-foreground)] mb-2">
            계정 관리
          </h1>
          <p className="text-[var(--color-muted-foreground)]">
            2026년 06월 09일 • 사용자 역할 관리
          </p>
        </div>
        <button className="px-4 py-2 bg-[var(--color-primary)] text-[var(--color-primary-foreground)] rounded-lg text-sm font-medium hover:opacity-90 transition">
          + 사용자 등록
        </button>
      </div>

      {/* 역할 탭 */}
      <div className="flex gap-2 border-b border-[var(--color-border)]">
        {(['전체', 'ADMIN', 'STAFF', 'WRITER'] as const).map((role) => (
          <button
            key={role}
            onClick={() => setSelectedRole(role)}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition ${
              selectedRole === role
                ? 'border-b-[var(--color-primary)] text-[var(--color-primary)]'
                : 'border-b-transparent text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]'
            }`}
          >
            {role === '전체' ? '전체' : `${role} (${users.filter(u => u.role === role).length})`}
          </button>
        ))}
      </div>

      {/* 사용자 목록 테이블 */}
      <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-[var(--color-border)] border-t-[var(--color-primary)] mx-auto mb-3"></div>
            <p className="text-sm text-[var(--color-muted-foreground)]">데이터 로딩 중...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center">
            <p className="text-red-400">오류: {error}</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-[var(--color-muted-foreground)]">등록된 사용자가 없습니다</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[var(--color-primary)]/10 border-b border-[var(--color-border)]">
                <tr>
                  <th className="px-6 py-3 text-left font-semibold text-[var(--color-foreground)] text-xs uppercase">사용자 ID</th>
                  <th className="px-6 py-3 text-left font-semibold text-[var(--color-foreground)] text-xs uppercase">현재 역할</th>
                  <th className="px-6 py-3 text-left font-semibold text-[var(--color-foreground)] text-xs uppercase">등록일</th>
                  <th className="px-6 py-3 text-left font-semibold text-[var(--color-foreground)] text-xs uppercase">역할 변경</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {filteredUsers.map((userRole) => (
                  <tr key={userRole.id} className="hover:bg-[var(--color-primary)]/5">
                    <td className="px-6 py-4 text-[var(--color-foreground)] font-mono text-xs">
                      {userRole.user_id.substring(0, 8)}...
                    </td>
                    <td className="px-6 py-4">
                      <span className="bg-blue-500/20 text-blue-400 px-3 py-1 rounded text-xs font-medium">
                        {roleLabel(userRole.role)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-[var(--color-muted-foreground)] text-xs">
                      {new Date(userRole.created_at).toLocaleDateString('ko-KR')}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-1">
                        {(['ADMIN', 'STAFF', 'WRITER'] as const).map((role) => (
                          <button
                            key={role}
                            onClick={() => handleChangeRole(userRole.user_id, role)}
                            disabled={changingUserId === userRole.user_id}
                            className={`px-2 py-1 rounded text-xs font-medium transition ${
                              userRole.role === role
                                ? 'bg-[var(--color-primary)] text-[var(--color-primary-foreground)]'
                                : 'bg-[var(--color-border)] text-[var(--color-muted-foreground)] hover:bg-[var(--color-primary)]/20'
                            } disabled:opacity-50`}
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
