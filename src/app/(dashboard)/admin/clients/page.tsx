'use client';

// 거래처 DB — 청구서가 참조하는 거래처(회사) 관리. 조회: ADMIN/STAFF · 수정: ADMIN only.
// 삭제는 청구서 FK 참조 때문에 미제공 → '미사용'(is_active=false) 토글로 비활성화.

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useAuthStore } from '@/store/authStore';
import type { Client } from '@/types/invoice';
import { useTableSort } from '@/hooks/useTableSort';
import { useRowFocus } from '@/hooks/useRowFocus';
import { SortableHeader } from '@/components/ui/SortableHeader';

// 거래처명 인라인 편집 셀 (텍스트 가운데, 연필 아이콘은 절대배치로 겹침 없이 함께 이동)
function ClientNameCell({
  id,
  name,
  editable,
  onSaved,
}: {
  id: string;
  name: string;
  editable: boolean;
  onSaved: (id: string, name: string) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(name);
  const [saving, setSaving] = useState(false);

  const handleSave = useCallback(async () => {
    const next = draft.trim();
    if (!next || next === name) { setIsEditing(false); setDraft(name); return; }
    setSaving(true);
    try {
      const res = await fetch(`/api/clients/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: next }),
      });
      if (res.ok) { onSaved(id, next); setIsEditing(false); }
    } finally {
      setSaving(false);
    }
  }, [id, draft, name, onSaved]);

  if (!editable) return <span className="text-foreground">{name}</span>;

  if (isEditing) {
    return (
      <input
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleSave();
          if (e.key === 'Escape') { setDraft(name); setIsEditing(false); }
        }}
        onBlur={handleSave}
        autoFocus
        disabled={saving}
        className="w-40 px-2 py-1 text-xs text-center bg-background border border-primary rounded outline-none text-foreground"
      />
    );
  }

  return (
    <span className="relative inline-block group">
      <span className="text-foreground">{name}</span>
      <button
        onClick={() => { setDraft(name); setIsEditing(true); }}
        className="absolute left-full top-1/2 -translate-y-1/2 ml-1 opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-foreground transition rounded hover:bg-primary/10"
        title="거래처명 수정"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
        </svg>
      </button>
    </span>
  );
}

// 사용여부 토글 — 사용중(초록)/미사용(빨강). 클릭 시 전환. ADMIN만.
function StatusCell({ active, editable, onToggle }: { active: boolean; editable: boolean; onToggle: () => void }) {
  const cls = active ? 'text-green-500' : 'text-red-400';
  const label = active ? '사용중' : '미사용';
  if (!editable) {
    return <span className={`inline-block px-3 py-1 rounded-md text-xs font-medium ${active ? 'bg-green-500/15' : 'bg-red-500/15'} ${cls}`}>{label}</span>;
  }
  return (
    <button
      type="button"
      onClick={onToggle}
      title={active ? '클릭하면 미사용' : '클릭하면 사용중'}
      className={`inline-block px-3 py-1 rounded-md text-xs font-medium transition cursor-pointer ${
        active ? 'bg-green-500/20 text-green-500 hover:bg-green-500/30' : 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
      }`}
    >
      {label}
    </button>
  );
}

export default function ClientsDbPage() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN';

  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');

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

  const patchClient = async (id: string, patch: { name?: string; is_active?: boolean }) => {
    const res = await fetch(`/api/clients/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    if (res.ok) {
      const { client } = await res.json();
      setClients((prev) => prev.map((c) => (c.id === id ? client : c)));
      showToast('저장 완료');
    } else {
      showToast((await res.json()).error || '저장 실패');
    }
  };

  const handleNameSaved = useCallback((id: string, name: string) => {
    setClients((prev) => prev.map((c) => (c.id === id ? { ...c, name } : c)));
  }, []);

  const { sortKey, dir, toggle, sortRows } = useTableSort<Client>({
    name: (c) => c.name,
    is_active: (c) => (c.is_active ? 1 : 0),
    created_at: (c) => c.created_at ?? '',
  }, 'pf_sort_clients');

  const sorted = useMemo(() => sortRows(clients), [clients, sortRows]);

  useRowFocus(!isLoading && sorted.length > 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">거래처 DB</h1>
          <p className="text-muted-foreground text-sm">
            청구서가 참조하는 거래처(회사) 관리
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

      <div className="bg-card border border-border rounded-lg overflow-hidden w-full max-w-3xl mx-auto">
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
                  <SortableHeader label="거래처명" sortKey="name" activeKey={sortKey} dir={dir} onSort={toggle} align="center" className="px-6 py-3 text-xs uppercase" />
                  <SortableHeader label="상태" sortKey="is_active" activeKey={sortKey} dir={dir} onSort={toggle} align="center" className="px-6 py-3 text-xs uppercase" />
                  <SortableHeader label="등록일" sortKey="created_at" activeKey={sortKey} dir={dir} onSort={toggle} align="center" className="px-6 py-3 text-xs uppercase" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {sorted.map((c) => (
                  <tr key={c.id} id={`row-${c.id}`} className="hover:bg-primary/5">
                    <td className="px-6 py-3 text-center">
                      <ClientNameCell id={c.id} name={c.name} editable={isAdmin} onSaved={handleNameSaved} />
                    </td>
                    <td className="px-6 py-3 text-center">
                      <StatusCell active={c.is_active} editable={isAdmin} onToggle={() => patchClient(c.id, { is_active: !c.is_active })} />
                    </td>
                    <td className="px-6 py-3 text-center text-muted-foreground text-xs">
                      {c.created_at ? new Date(c.created_at).toLocaleDateString('ko-KR') : '-'}
                    </td>
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
