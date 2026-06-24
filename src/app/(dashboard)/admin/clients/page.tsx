'use client';

// 거래처 DB — 청구서가 참조하는 거래처(회사) 관리. 조회: ADMIN/STAFF · 수정: ADMIN only.
// 삭제는 청구서 FK 참조 때문에 미제공 → '미사용'(is_active=false) 토글로 비활성화.

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import type { Client } from '@/types/invoice';
import { useTableSort } from '@/hooks/useTableSort';
import { useRowFocus } from '@/hooks/useRowFocus';
import { SortableHeader } from '@/components/ui/SortableHeader';
import { nextClientCode } from '@/lib/clients/clientCode';

export default function ClientsDbPage() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN';
  const router = useRouter();

  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  };

  const fetchClients = useCallback(async () => {
    try {
      const res = await fetch('/api/clients?all=1');
      if (!res.ok) throw new Error('목록을 불러올 수 없습니다.');
      setClients((await res.json()).clients || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- async fetch (마이크로태스크에서 setState)
  useEffect(() => { fetchClients(); }, [fetchClients]);

  const handleAdd = async () => {
    if (!newName.trim()) { showToast('거래처명을 입력하세요'); return; }
    const res = await fetch('/api/clients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim() }),
    });
    if (res.ok) {
      setAdding(false);
      setNewName('');
      fetchClients();
      showToast('거래처 등록 완료');
    } else {
      showToast((await res.json()).error || '등록 실패');
    }
  };

  const deleteClient = async (id: string) => {
    const res = await fetch(`/api/clients/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setClients((prev) => prev.filter((c) => c.id !== id));
      showToast('삭제 완료');
    } else {
      showToast((await res.json()).error || '삭제 실패');
    }
    setConfirmingId(null);
  };

  const { sortKey, dir, toggle, sortRows } = useTableSort<Client>({
    client_code: (c) => c.client_code ?? '',
    name: (c) => c.name,
    created_at: (c) => c.created_at ?? '',
  }, 'pf_sort_clients');

  const sorted = useMemo(() => sortRows(clients), [clients, sortRows]);

  // 등록 폼 거래처 코드 미리보기 — 다음 코드를 보여줌(서버가 최종 부여, 읽기전용)
  const previewCode = useMemo(
    () => nextClientCode(clients.map((c) => c.client_code).filter((v): v is string => !!v)),
    [clients]
  );

  useRowFocus(!isLoading && sorted.length > 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">거래처 DB</h1>
          <p className="text-muted-foreground text-sm">
            청구서가 참조하는 거래처(회사) 관리 · 행을 클릭하면 상세정보
            {!isAdmin && ' · 수정은 관리자만 가능'}
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => { setNewName(''); setAdding((v) => !v); }}
            className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition font-medium cursor-pointer"
          >
            + 등록
          </button>
        )}
      </div>

      {adding && (
        <div className="bg-card border border-primary/40 rounded-lg p-4 flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs text-muted-foreground mb-1 text-center">거래처 코드</label>
            <div
              className="w-24 px-3 py-2 text-sm text-center bg-muted/50 border border-border rounded-lg text-muted-foreground font-mono tabular-nums select-none"
              title="자동 부여 (중복·수정 불가)"
            >
              {previewCode}
            </div>
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1 text-center">거래처명</label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }}
              placeholder="거래처명 입력"
              autoFocus
              className="w-64 px-3 py-2 text-sm text-center bg-background border border-border rounded-lg outline-none focus:border-primary text-foreground"
            />
          </div>
          <button
            onClick={handleAdd}
            className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition cursor-pointer"
          >
            추가
          </button>
        </div>
      )}

      <div className="bg-card border border-border rounded-lg overflow-hidden w-full max-w-5xl mx-auto">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-border border-t-primary mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">데이터 로딩 중...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center"><p className="text-red-400">오류: {error}</p></div>
        ) : sorted.length === 0 ? (
          <div className="p-8 text-center"><p className="text-muted-foreground">등록된 거래처가 없습니다.</p></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-primary/10 border-b border-border">
                <tr>
                  <SortableHeader label="거래처 코드" sortKey="client_code" activeKey={sortKey} dir={dir} onSort={toggle} align="center" className="px-6 py-3 text-xs uppercase" />
                  <SortableHeader label="거래처명" sortKey="name" activeKey={sortKey} dir={dir} onSort={toggle} align="center" className="px-6 py-3 text-xs uppercase" />
                  <SortableHeader label="등록일" sortKey="created_at" activeKey={sortKey} dir={dir} onSort={toggle} align="center" className="px-6 py-3 text-xs uppercase" />
                  {isAdmin && <th className="px-6 py-3 text-center font-bold text-foreground text-xs uppercase w-24">액션</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {sorted.map((c) => (
                  <tr
                    key={c.id}
                    id={`row-${c.id}`}
                    onClick={() => router.push(`/admin/clients/${c.id}`)}
                    className="hover:bg-primary/5 cursor-pointer"
                  >
                    <td className="px-6 py-3 text-center">
                      <span className="font-mono text-xs tabular-nums text-foreground">{c.client_code}</span>
                    </td>
                    <td className="px-6 py-3 text-center text-foreground">{c.name}</td>
                    <td className="px-6 py-3 text-center text-muted-foreground text-xs">
                      {c.created_at ? new Date(c.created_at).toLocaleDateString('ko-KR') : '-'}
                    </td>
                    {isAdmin && (
                      <td className="px-6 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                        {confirmingId === c.id ? (
                          <div className="flex items-center justify-center gap-1 whitespace-nowrap">
                            <button
                              onClick={() => deleteClient(c.id)}
                              className="px-2 py-1 rounded text-[11px] font-medium bg-red-500/20 text-red-400 hover:bg-red-500/30 transition cursor-pointer whitespace-nowrap"
                            >
                              삭제
                            </button>
                            <button
                              onClick={() => setConfirmingId(null)}
                              className="px-2 py-1 rounded text-[11px] font-medium bg-gray-500/20 text-gray-400 hover:bg-gray-500/30 transition cursor-pointer whitespace-nowrap"
                            >
                              취소
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmingId(c.id)}
                            className="p-1.5 text-muted-foreground hover:text-red-400 transition rounded hover:bg-red-500/10 cursor-pointer"
                            title="삭제"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/>
                            </svg>
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-foreground text-background text-sm px-4 py-2 rounded-full shadow-lg z-50 pointer-events-none">
          {toast}
        </div>
      )}
    </div>
  );
}
