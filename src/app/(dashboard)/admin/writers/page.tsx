'use client';

// 작가 마스터 — 작가명·구분(전속/일반)·용역 요율(%) 관리
// 로그인 계정(user_roles)과 무관한 작가/작업자 레지스트리. 조회: ADMIN+STAFF / 수정: ADMIN only

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useAuthStore } from '@/store/authStore';
import type { Writer } from '@/types/invoice';
import { useTableSort } from '@/hooks/useTableSort';
import { SortableHeader } from '@/components/ui/SortableHeader';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from '@/components/ui/dropdown-menu';

const WRITER_TYPES = ['전속작가', '일반작가'] as const;
type WriterType = (typeof WRITER_TYPES)[number];
type WriterTab = '전체' | WriterType;

function typeBadge(type: string) {
  return type === '전속작가' ? '✍️ 전속작가' : '📝 일반작가';
}

// 텍스트 인라인 편집 셀 (작가명)
function NameCell({
  value,
  editable,
  onSave,
}: {
  value: string;
  editable: boolean;
  onSave: (v: string) => Promise<void>;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!draft.trim()) { setIsEditing(false); setDraft(value); return; }
    setSaving(true);
    try {
      await onSave(draft.trim());
      setIsEditing(false);
    } finally {
      setSaving(false);
    }
  };

  if (!editable) return <span className="text-foreground">{value}</span>;

  if (isEditing) {
    return (
      <input
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleSave();
          if (e.key === 'Escape') { setDraft(value); setIsEditing(false); }
        }}
        onBlur={handleSave}
        autoFocus
        disabled={saving}
        className="w-28 px-2 py-1 text-xs bg-background border border-primary rounded outline-none text-foreground"
      />
    );
  }

  return (
    <div className="flex items-center gap-1.5 group">
      <span className="text-foreground">{value}</span>
      <button
        onClick={() => { setDraft(value); setIsEditing(true); }}
        className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-foreground transition rounded hover:bg-primary/10 cursor-pointer"
        title="이름 수정"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
        </svg>
      </button>
    </div>
  );
}

// 구분(전속/일반) 선택 — 테마 그라데이션과 어울리는 커스텀 드롭다운(검은 native select 대체)
function WriterTypeSelect({
  value,
  onChange,
  triggerClassName,
}: {
  value: string;
  onChange: (v: WriterType) => void;
  triggerClassName?: string;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        title="구분 변경"
        className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-primary/10 text-foreground text-sm border border-border hover:border-primary transition cursor-pointer ${triggerClassName ?? ''}`}
      >
        {typeBadge(value)}
        <span className="text-[10px] opacity-70" aria-hidden="true">▾</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center" className="min-w-36 bg-card border border-border">
        <DropdownMenuRadioGroup value={value} onValueChange={(v) => onChange(String(v) as WriterType)}>
          {WRITER_TYPES.map((t) => (
            <DropdownMenuRadioItem key={t} value={t} className="text-foreground cursor-pointer">
              {typeBadge(t)}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// 용역 요율(%) 인라인 편집 셀
function FeeRateCell({
  value,
  editable,
  onSave,
}: {
  value: number;
  editable: boolean;
  onSave: (v: number) => Promise<void>;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const num = Math.min(100, Math.max(0, Number(draft) || 0));
    setSaving(true);
    try {
      await onSave(num);
      setIsEditing(false);
    } finally {
      setSaving(false);
    }
  };

  if (!editable) return <span className="tabular-nums text-foreground">{value}%</span>;

  if (isEditing) {
    return (
      <input
        type="number"
        min={0}
        max={100}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleSave();
          if (e.key === 'Escape') { setDraft(String(value)); setIsEditing(false); }
        }}
        onBlur={handleSave}
        autoFocus
        disabled={saving}
        className="w-20 px-2 py-1 text-xs text-center bg-background border border-primary rounded outline-none text-foreground tabular-nums"
      />
    );
  }

  return (
    <button
      onClick={() => { setDraft(String(value)); setIsEditing(true); }}
      className="tabular-nums text-foreground hover:text-primary transition cursor-pointer"
      title="클릭하여 수정"
    >
      {value}%
    </button>
  );
}

export default function WriterMasterPage() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN';

  const [writers, setWriters] = useState<Writer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState<WriterTab>('전체');
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  // 등록 폼
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<WriterType>('전속작가');
  const [newFee, setNewFee] = useState('70');

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  };

  const fetchWriters = useCallback(async () => {
    try {
      const res = await fetch('/api/writers');
      if (!res.ok) throw new Error('목록을 불러올 수 없습니다.');
      setWriters((await res.json()).writers || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- async fetch라 setState는 마이크로태스크에서 실행 (동기 cascading render 아님)
  useEffect(() => { fetchWriters(); }, [fetchWriters]);

  const handleAdd = async () => {
    if (!newName.trim()) { showToast('작가명을 입력하세요'); return; }
    const res = await fetch('/api/writers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: newName.trim(),
        writer_type: newType,
        fee_rate: Math.min(100, Math.max(0, Number(newFee) || 0)),
      }),
    });
    if (res.ok) {
      setAdding(false);
      setNewName(''); setNewType('전속작가'); setNewFee('70');
      fetchWriters();
      showToast('작가 등록 완료');
    } else {
      showToast((await res.json()).error || '등록 실패');
    }
  };

  const patchWriter = async (id: string, patch: Partial<Pick<Writer, 'name' | 'writer_type' | 'fee_rate'>>) => {
    const res = await fetch(`/api/writers/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    if (res.ok) {
      const { writer } = await res.json();
      setWriters((prev) => prev.map((w) => (w.id === id ? writer : w)));
      showToast('저장 완료');
    } else {
      showToast((await res.json()).error || '저장 실패');
    }
  };

  const deleteWriter = async (id: string) => {
    const res = await fetch(`/api/writers/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setWriters((prev) => prev.filter((w) => w.id !== id));
      showToast('삭제 완료');
    } else {
      showToast((await res.json()).error || '삭제 실패');
    }
    setConfirmingId(null);
  };

  // 정렬: 작가명·구분·수수료율
  const { sortKey, dir, toggle, sortRows } = useTableSort<Writer>({
    name: (w) => w.name,
    writer_type: (w) => w.writer_type,
    fee_rate: (w) => w.fee_rate,
  });

  const filtered = useMemo(() => {
    const base = selectedTab === '전체'
      ? writers
      : writers.filter((w) => w.writer_type === selectedTab);
    return sortRows(base);
  }, [writers, selectedTab, sortRows]);

  const tabCount = (tab: WriterTab) =>
    tab === '전체' ? writers.length : writers.filter((w) => w.writer_type === tab).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">작가 마스터</h1>
          <p className="text-muted-foreground text-sm">
            작가/작업자 명단 · 구분 · 용역 요율 관리
            {!isAdmin && ' · 수정은 관리자만 가능'}
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setAdding((v) => !v)}
            className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition font-medium cursor-pointer"
          >
            + 등록
          </button>
        )}
      </div>

      {/* 등록 폼 */}
      {adding && (
        <div className="bg-card border border-primary/40 rounded-lg p-4 flex flex-wrap items-end gap-3">
          <div className="w-64">
            <label className="block text-xs text-muted-foreground mb-1">작가명</label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }}
              placeholder="작가명 입력"
              maxLength={20}
              className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg outline-none focus:border-primary text-foreground"
            />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">구분</label>
            <WriterTypeSelect value={newType} onChange={setNewType} />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">용역 요율(%)</label>
            <input
              type="number"
              min={0}
              max={100}
              value={newFee}
              onChange={(e) => setNewFee(e.target.value)}
              className="w-28 px-3 py-2 text-sm bg-background border border-border rounded-lg outline-none focus:border-primary text-foreground tabular-nums"
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

      {/* 탭 */}
      <div className="flex flex-wrap gap-2 border-b border-border">
        {(['전체', ...WRITER_TYPES] as WriterTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setSelectedTab(tab)}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition cursor-pointer whitespace-nowrap ${
              selectedTab === tab
                ? 'border-b-primary text-primary'
                : 'border-b-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {`${tab} (${tabCount(tab)})`}
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
            <p className="text-muted-foreground">등록된 작가가 없습니다.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-primary/10 border-b border-border">
                <tr>
                  <SortableHeader label="작가명" sortKey="name" activeKey={sortKey} dir={dir} onSort={toggle} className="px-6 py-3 text-xs uppercase" />
                  <SortableHeader label="구분" sortKey="writer_type" activeKey={sortKey} dir={dir} onSort={toggle} align="center" className="px-6 py-3 text-xs uppercase" />
                  <SortableHeader label="용역 요율(%)" sortKey="fee_rate" activeKey={sortKey} dir={dir} onSort={toggle} align="center" className="px-6 py-3 text-xs uppercase" />
                  {isAdmin && <th className="px-6 py-3 text-center font-semibold text-foreground text-xs uppercase w-24">액션</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((w) => (
                  <tr key={w.id} className="hover:bg-primary/5">
                    <td className="px-6 py-4">
                      <NameCell value={w.name} editable={isAdmin} onSave={(v) => patchWriter(w.id, { name: v })} />
                    </td>
                    <td className="px-6 py-4 text-center">
                      {isAdmin ? (
                        <WriterTypeSelect
                          value={w.writer_type}
                          onChange={(v) => patchWriter(w.id, { writer_type: v })}
                          triggerClassName="mx-auto"
                        />
                      ) : (
                        <span className="inline-block bg-primary/15 text-primary px-3 py-1 rounded-md text-xs font-medium">
                          {typeBadge(w.writer_type)}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <FeeRateCell value={w.fee_rate} editable={isAdmin} onSave={(v) => patchWriter(w.id, { fee_rate: v })} />
                    </td>
                    {isAdmin && (
                      <td className="px-6 py-4 text-center">
                        {confirmingId === w.id ? (
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => deleteWriter(w.id)}
                              className="px-2 py-1 rounded text-[11px] font-medium bg-red-500/20 text-red-400 hover:bg-red-500/30 transition cursor-pointer"
                            >
                              삭제
                            </button>
                            <button
                              onClick={() => setConfirmingId(null)}
                              className="px-2 py-1 rounded text-[11px] font-medium bg-gray-500/20 text-gray-400 hover:bg-gray-500/30 transition cursor-pointer"
                            >
                              취소
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmingId(w.id)}
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
