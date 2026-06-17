'use client';

// 작가 마스터 — 작가명·구분(전속/일반)·용역 요율(%) 관리
// 로그인 계정(user_roles)과 무관한 작가/작업자 레지스트리. 조회: ADMIN+STAFF / 수정: ADMIN only

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useAuthStore } from '@/store/authStore';
import type { Writer, WorkWriterGroup } from '@/types/invoice';
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
        className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-foreground text-sm border border-border hover:border-primary transition cursor-pointer ${triggerClassName ?? ''}`}
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

// 저작물 요율(%) 인라인 편집 셀 — null이면 '미지정', 입력을 비우면 미지정으로 저장
function NullableRateCell({
  value,
  editable,
  onSave,
}: {
  value: number | null;
  editable: boolean;
  onSave: (v: number | null) => Promise<void>;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(value == null ? '' : String(value));
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const next = draft.trim() === '' ? null : Math.min(100, Math.max(0, Number(draft) || 0));
    setSaving(true);
    try {
      await onSave(next);
      setIsEditing(false);
    } finally {
      setSaving(false);
    }
  };

  if (!editable) {
    return value == null
      ? <span className="text-muted-foreground text-xs">미지정</span>
      : <span className="tabular-nums text-foreground">{value}%</span>;
  }

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
          if (e.key === 'Escape') { setDraft(value == null ? '' : String(value)); setIsEditing(false); }
        }}
        onBlur={handleSave}
        autoFocus
        disabled={saving}
        placeholder="미지정"
        className="w-20 px-2 py-1 text-xs text-center bg-background border border-primary rounded outline-none text-foreground tabular-nums"
      />
    );
  }

  return (
    <button
      onClick={() => { setDraft(value == null ? '' : String(value)); setIsEditing(true); }}
      className={`transition cursor-pointer hover:text-primary ${value == null ? 'text-muted-foreground text-xs' : 'tabular-nums text-foreground'}`}
      title="클릭하여 수정 (비우면 미지정)"
    >
      {value == null ? '미지정' : `${value}%`}
    </button>
  );
}

// 재계약일 인라인 편집 셀(날짜) — null이면 '-', 클릭→date 입력, 비우면 미지정(null)로 저장
function DateCell({
  value,
  editable,
  onSave,
}: {
  value: string | null;
  editable: boolean;
  onSave: (v: string | null) => Promise<void>;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(draft.trim() === '' ? null : draft);
      setIsEditing(false);
    } finally {
      setSaving(false);
    }
  };

  if (!editable) {
    return <span className={value ? 'tabular-nums text-foreground' : 'text-muted-foreground text-xs'}>{value ?? '-'}</span>;
  }

  if (isEditing) {
    return (
      <input
        type="date"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleSave();
          if (e.key === 'Escape') { setDraft(value ?? ''); setIsEditing(false); }
        }}
        onBlur={handleSave}
        autoFocus
        disabled={saving}
        // bg-transparent: 수정 중·blur 시 검은 블럭 대신 배경색과 어우러지게
        className="w-full max-w-[150px] px-2 py-1 text-xs text-center bg-transparent border border-primary rounded outline-none text-foreground tabular-nums"
      />
    );
  }

  return (
    <button
      onClick={() => { setDraft(value ?? ''); setIsEditing(true); }}
      className={`transition cursor-pointer hover:text-primary ${value ? 'tabular-nums text-foreground' : 'text-muted-foreground text-xs'}`}
      title="클릭하여 수정 (비우면 미지정)"
    >
      {value ?? '-'}
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
  const [newPermanent, setNewPermanent] = useState(''); // 영구 저작물 요율(%) — 빈값=미지정
  const [newGeneral, setNewGeneral] = useState('');     // 일반 저작물 요율(%) — 빈값=미지정
  const [newRecontract, setNewRecontract] = useState(''); // 재계약일 — 빈값=미지정
  // 작가명 입력 방식: 저작물 DB 작가 선택(select) / 직접 입력(manual)
  const [worksWriters, setWorksWriters] = useState<string[]>([]);
  const [nameMode, setNameMode] = useState<'select' | 'manual'>('select');

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

  // 저작물 DB 작가명(중복제거·이름순) — 등록 폼 선택박스 옵션용. /api/works/writers 재사용
  const fetchWorksWriters = useCallback(async () => {
    try {
      const res = await fetch('/api/works/writers');
      if (res.ok) {
        const { writers } = (await res.json()) as { writers: WorkWriterGroup[] };
        setWorksWriters((writers ?? []).map((w) => w.writer_name));
      }
    } catch {
      // 무시 — 직접 입력으로도 등록 가능
    }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- async fetch라 setState는 마이크로태스크에서 실행 (동기 cascading render 아님)
  useEffect(() => { fetchWriters(); }, [fetchWriters]);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- async fetch
  useEffect(() => { fetchWorksWriters(); }, [fetchWorksWriters]);

  const handleAdd = async () => {
    if (!newName.trim()) { showToast('작가명을 입력하세요'); return; }
    const toRate = (s: string) => (s.trim() === '' ? null : Math.min(100, Math.max(0, Number(s) || 0)));
    const res = await fetch('/api/writers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: newName.trim(),
        writer_type: newType,
        fee_rate: Math.min(100, Math.max(0, Number(newFee) || 0)),
        permanent_rate: toRate(newPermanent),
        general_rate: toRate(newGeneral),
        recontract_date: newRecontract || null,
      }),
    });
    if (res.ok) {
      setAdding(false);
      setNewName(''); setNewType('전속작가'); setNewFee('70');
      setNewPermanent(''); setNewGeneral(''); setNewRecontract(''); setNameMode('select');
      fetchWriters();
      showToast('작가 등록 완료');
    } else {
      showToast((await res.json()).error || '등록 실패');
    }
  };

  const patchWriter = async (id: string, patch: Partial<Pick<Writer, 'name' | 'writer_type' | 'fee_rate' | 'permanent_rate' | 'general_rate' | 'recontract_date'>>) => {
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
    permanent_rate: (w) => w.permanent_rate,
    general_rate: (w) => w.general_rate,
    fee_rate: (w) => w.fee_rate,
    recontract_date: (w) => w.recontract_date,
  }, 'pf_sort_writers');

  const filtered = useMemo(() => {
    const base = selectedTab === '전체'
      ? writers
      : writers.filter((w) => w.writer_type === selectedTab);
    return sortRows(base);
  }, [writers, selectedTab, sortRows]);

  const tabCount = (tab: WriterTab) =>
    tab === '전체' ? writers.length : writers.filter((w) => w.writer_type === tab).length;

  // 저작물 DB 작가 중 아직 마스터에 미등록인 이름만 — 등록되면 자동으로 선택박스에서 사라짐
  const availableNames = useMemo(() => {
    const registered = new Set(writers.map((w) => w.name.trim()));
    return worksWriters.filter((n) => !registered.has(n.trim()));
  }, [writers, worksWriters]);

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
            onClick={() => {
              if (!adding) { setNewName(''); setNameMode('select'); }
              setAdding((v) => !v);
            }}
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
            <label className="block text-xs text-muted-foreground mb-1 text-center">작가명</label>
            {nameMode === 'select' && availableNames.length > 0 ? (
              <select
                value={newName}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === '__manual__') { setNameMode('manual'); setNewName(''); }
                  else setNewName(v);
                }}
                className="w-full px-3 py-2 text-sm text-center bg-background border border-border rounded-lg outline-none focus:border-primary text-foreground"
              >
                <option value="">저작물 DB에서 선택…</option>
                {availableNames.map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
                <option value="__manual__">✏️ 직접 입력…</option>
              </select>
            ) : (
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }}
                  placeholder="작가명 입력"
                  maxLength={20}
                  autoFocus
                  className="w-full px-3 py-2 text-sm text-center bg-background border border-border rounded-lg outline-none focus:border-primary text-foreground"
                />
                {availableNames.length > 0 && (
                  <button
                    type="button"
                    onClick={() => { setNameMode('select'); setNewName(''); }}
                    title="저작물 DB 목록에서 선택"
                    className="shrink-0 px-2 py-2 text-xs border border-border rounded-lg text-muted-foreground hover:text-foreground hover:bg-primary/10 transition cursor-pointer"
                  >
                    목록
                  </button>
                )}
              </div>
            )}
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1 text-center">구분</label>
            <WriterTypeSelect value={newType} onChange={setNewType} />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1 text-center">영구 저작물(%)</label>
            <input
              type="number"
              min={0}
              max={100}
              value={newPermanent}
              onChange={(e) => setNewPermanent(e.target.value)}
              placeholder="미지정"
              className="w-28 px-3 py-2 text-sm text-center bg-background border border-border rounded-lg outline-none focus:border-primary text-foreground tabular-nums"
            />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1 text-center">일반 저작물(%)</label>
            <input
              type="number"
              min={0}
              max={100}
              value={newGeneral}
              onChange={(e) => setNewGeneral(e.target.value)}
              placeholder="미지정"
              className="w-28 px-3 py-2 text-sm text-center bg-background border border-border rounded-lg outline-none focus:border-primary text-foreground tabular-nums"
            />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1 text-center">용역 요율(%)</label>
            <input
              type="number"
              min={0}
              max={100}
              value={newFee}
              onChange={(e) => setNewFee(e.target.value)}
              className="w-28 px-3 py-2 text-sm text-center bg-background border border-border rounded-lg outline-none focus:border-primary text-foreground tabular-nums"
            />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1 text-center">재계약일</label>
            <input
              type="date"
              value={newRecontract}
              onChange={(e) => setNewRecontract(e.target.value)}
              className="w-40 px-3 py-2 text-sm text-center bg-background border border-border rounded-lg outline-none focus:border-primary text-foreground tabular-nums"
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

      {/* 테이블 — 컬럼 4개라 전체 폭을 채우면 과하게 벌어져, 표 카드만 적정 폭으로 제한하고 가운데 정렬(프라이스 테이블과 동일 방식) */}
      <div className="bg-card border border-border rounded-lg overflow-hidden w-full max-w-6xl mx-auto">
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
                  <SortableHeader label="작가명" sortKey="name" activeKey={sortKey} dir={dir} onSort={toggle} className="px-6 py-2.5 text-xs uppercase" />
                  <SortableHeader label="구분" sortKey="writer_type" activeKey={sortKey} dir={dir} onSort={toggle} align="center" className="px-6 py-2.5 text-xs uppercase" />
                  <SortableHeader label="영구 저작물(%)" sortKey="permanent_rate" activeKey={sortKey} dir={dir} onSort={toggle} align="center" className="px-6 py-2.5 text-xs uppercase" />
                  <SortableHeader label="일반 저작물(%)" sortKey="general_rate" activeKey={sortKey} dir={dir} onSort={toggle} align="center" className="px-6 py-2.5 text-xs uppercase" />
                  <SortableHeader label="용역 요율(%)" sortKey="fee_rate" activeKey={sortKey} dir={dir} onSort={toggle} align="center" className="px-6 py-2.5 text-xs uppercase" />
                  <SortableHeader label="재계약일" sortKey="recontract_date" activeKey={sortKey} dir={dir} onSort={toggle} align="center" className="px-6 py-2.5 text-xs uppercase" />
                  {isAdmin && <th className="px-6 py-2.5 text-center font-bold text-foreground text-xs uppercase w-24">액션</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((w) => (
                  <tr key={w.id} className="hover:bg-primary/5">
                    <td className="px-6 py-2.5">
                      <NameCell value={w.name} editable={isAdmin} onSave={(v) => patchWriter(w.id, { name: v })} />
                    </td>
                    <td className="px-6 py-2.5 text-center">
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
                    <td className="px-6 py-2.5 text-center">
                      <NullableRateCell value={w.permanent_rate} editable={isAdmin} onSave={(v) => patchWriter(w.id, { permanent_rate: v })} />
                    </td>
                    <td className="px-6 py-2.5 text-center">
                      <NullableRateCell value={w.general_rate} editable={isAdmin} onSave={(v) => patchWriter(w.id, { general_rate: v })} />
                    </td>
                    <td className="px-6 py-2.5 text-center">
                      <FeeRateCell value={w.fee_rate} editable={isAdmin} onSave={(v) => patchWriter(w.id, { fee_rate: v })} />
                    </td>
                    <td className="px-6 py-2.5 text-center">
                      <DateCell value={w.recontract_date} editable={isAdmin} onSave={(v) => patchWriter(w.id, { recontract_date: v })} />
                    </td>
                    {isAdmin && (
                      <td className="px-6 py-2.5 text-center">
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
