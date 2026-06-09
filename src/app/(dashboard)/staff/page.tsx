'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface StaffMember {
  id: string;
  user_id: string;
  role: string;
  email?: string;
  created_at: string;
}

export default function StaffPage() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStaff = async () => {
      try {
        const supabase = createClient();

        // user_roles에서 ADMIN/STAFF 역할 사용자 조회
        const { data, error: fetchError } = await supabase
          .from('user_roles')
          .select('*')
          .in('role', ['ADMIN', 'STAFF']);

        if (fetchError) throw fetchError;

        setStaff(data || []);
      } catch (err) {
        console.error('직원 목록 조회 오류:', err);
        setError(err instanceof Error ? err.message : '직원 목록을 불러올 수 없습니다');
      } finally {
        setIsLoading(false);
      }
    };

    fetchStaff();
  }, []);

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[var(--color-foreground)] mb-2">
            직원 관리
          </h1>
          <p className="text-[var(--color-muted-foreground)]">
            2026년 06월 09일 • 회사 직원 목록
          </p>
        </div>

        {/* + 직원 등록 버튼 */}
        <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition">
          + 직원 등록
        </button>
      </div>

      {/* 직원 목록 */}
      <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="p-8">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-[var(--color-border)] border-t-[var(--color-primary)] mr-3"></div>
              <p className="text-sm text-[var(--color-muted-foreground)]">데이터 로딩 중...</p>
            </div>
          </div>
        ) : error ? (
          <div className="p-8 text-center">
            <p className="text-red-400">오류: {error}</p>
          </div>
        ) : staff.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-[var(--color-muted-foreground)]">등록된 직원이 없습니다</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-blue-500/10 border-b border-[var(--color-border)]">
                <tr>
                  <th className="px-6 py-3 text-left font-semibold text-[var(--color-foreground)] text-xs uppercase">
                    역할
                  </th>
                  <th className="px-6 py-3 text-left font-semibold text-[var(--color-foreground)] text-xs uppercase">
                    사용자 ID
                  </th>
                  <th className="px-6 py-3 text-left font-semibold text-[var(--color-foreground)] text-xs uppercase">
                    등록일
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {staff.map((member) => (
                  <tr key={member.id} className="hover:bg-[var(--color-border)]/30">
                    <td className="px-6 py-4 text-[var(--color-foreground)]">
                      <span className="bg-blue-500/20 text-blue-400 px-3 py-1 rounded text-xs font-medium">
                        {member.role === 'ADMIN' ? '👑 관리자' : '💼 직원'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-[var(--color-foreground)] font-mono text-xs truncate">
                      {member.user_id}
                    </td>
                    <td className="px-6 py-4 text-[var(--color-muted-foreground)]">
                      {new Date(member.created_at).toLocaleDateString('ko-KR')}
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
