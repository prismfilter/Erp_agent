'use client';

// 저작물 DB — 전속작가 영구 관리 대상 저작물
// 좌측 작가 목록(이름순, sticky) → 우측 해당 작가 표. 전체보기는 20개씩 더보기.
// 조회: ADMIN/STAFF · 추가/수정/삭제: ADMIN only (API에서 강제)

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useAuthStore } from '@/store/authStore';
import type { MusicWork, WorkWriterGroup } from '@/types/invoice';
import { useTableSort } from '@/hooks/useTableSort';
import { SortableHeader } from '@/components/ui/SortableHeader';

const PAGE_SIZE = 20;

// 인라인 편집 셀 — 텍스트/숫자/날짜 공용
function EditableCell({
  value,
  editable,
  type,
  onSave,
}: {
  value: string | number | null;
  editable: boolean;
  type: 'text' | 'number' | 'date';
  onSave: (v: string | number | null) => Promise<void>;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<string>(value == null ? '' : String(value));
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      let next: string | number | null;
      if (draft.trim() === '') next = null;
      else if (type === 'number') next = Number(draft);
      else next = draft.trim();
      await onSave(next);
      setIsEditing(false);
    } finally {
      setSaving(false);
    }
  };

  if (!editable) {
    return <span>{value != null && value !== '' ? String(value) : '-'}</span>;
  }

  if (isEditing) {
    return (
      <input
        type={type}
        step={type === 'number' ? 'any' : undefined}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleSave();
          if (e.key === 'Escape') setIsEditing(false);
        }}
        onBlur={handleSave}
        autoFocus
        disabled={saving}
        className="w-full max-w-[160px] px-2 py-1 text-xs text-center bg-background border border-primary rounded outline-none text-foreground"
      />
    );
  }

  return (
    <button
      onClick={() => { setDraft(value == null ? '' : String(value)); setIsEditing(true); }}
      className="hover:text-primary transition cursor-pointer"
      title="클릭하여 수정"
    >
      {value != null && value !== '' ? String(value) : '-'}
    </button>
  );
}

interface AddForm {
  no: string;
  writer_name: string;
  komca_code: string;
  song_title: string;
  artist: string;
  domestic_share: string;
  overseas_share: string;
  rate: string;
  recontract_date: string;
}

const EMPTY_FORM: AddForm = {
  no: '', writer_name: '', komca_code: '', song_title: '', artist: '',
  domestic_share: '', overseas_share: '', rate: '', recontract_date: '',
};

export default function WorksPage() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN';

  const [writers, setWriters] = useState<WorkWriterGroup[]>([]);
  const [selectedWriter, setSelectedWriter] = useState<string | null>(null); // null = 전체보기
  const [works, setWorks] = useState<MusicWork[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState<AddForm>(EMPTY_FORM);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  };

  // 좌측 작가 목록
  const loadWriters = useCallback(async () => {
    try {
      const res = await fetch('/api/works/writers');
      if (res.ok) setWriters((await res.json()).writers || []);
    } catch {
      // 무시 — 표 영역 에러로 충분
    }
  }, []);

  // 표 로딩 (작가 선택 시 전 행 / 전체보기 시 첫 페이지)
  const loadWorks = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const url = selectedWriter
        ? `/api/works?writer=${encodeURIComponent(selectedWriter)}`
        : `/api/works?offset=0&limit=${PAGE_SIZE}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error((await res.json()).error || '목록을 불러올 수 없습니다.');
      const json = await res.json();
      setWorks(json.works || []);
      setTotal(json.total || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [selectedWriter]);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- async fetch (마이크로태스크에서 setState)
  useEffect(() => { loadWriters(); }, [loadWriters]);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- async fetch
  useEffect(() => { loadWorks(); }, [loadWorks]);

  // 전체보기 더보기 (다음 20개 append)
  const loadMore = async () => {
    try {
      const res = await fetch(`/api/works?offset=${works.length}&limit=${PAGE_SIZE}`);
      if (!res.ok) return;
      const json = await res.json();
      setWorks((prev) => [...prev, ...(json.works || [])]);
      setTotal(json.total || 0);
    } catch {
      // 무시
    }
  };

  // 인라인 수정
  const patchWork = async (id: string, patch: Partial<MusicWork>) => {
    const res = await fetch(`/api/works/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    if (res.ok) {
      const { work } = await res.json();
      setWorks((prev) => prev.map((w) => (w.id === id ? work : w)));
      showToast('저장 완료');
    } else {
      showToast((await res.json()).error || '저장 실패');
    }
  };

  // 저작물 추가
  const handleAdd = async () => {
    if (!form.no.trim()) { showToast('NO.를 입력하세요'); return; }
    if (!form.writer_name) { showToast('작가명을 선택하세요'); return; }
    if (!form.song_title.trim()) { showToast('곡명을 입력하세요'); return; }
    const toNum = (s: string) => (s.trim() === '' ? null : Number(s));
    const res = await fetch('/api/works', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        no: Number(form.no),
        writer_name: form.writer_name,
        komca_code: form.komca_code.trim() || null,
        song_title: form.song_title.trim(),
        artist: form.artist.trim() || null,
        domestic_share: toNum(form.domestic_share),
        overseas_share: toNum(form.overseas_share),
        rate: toNum(form.rate),
        recontract_date: form.recontract_date || null,
      }),
    });
    if (res.ok) {
      setAdding(false);
      setForm(EMPTY_FORM);
      await loadWriters();
      await loadWorks();
      showToast('저작물 추가 완료');
    } else {
      showToast((await res.json()).error || '추가 실패');
    }
  };

  // 행 삭제
  const handleDelete = async (id: string) => {
    if (!confirm('이 저작물을 삭제하시겠습니까?')) return;
    const res = await fetch(`/api/works/${id}`, { method: 'DELETE' });
    if (res.ok) {
      await loadWriters();
      await loadWorks();
      showToast('삭제 완료');
    } else {
      showToast((await res.json()).error || '삭제 실패');
    }
  };

  // 정렬 (로드된 행 대상)
  const { sortKey, dir, toggle, sortRows } = useTableSort<MusicWork>({
    no: (w) => w.no,
    writer_name: (w) => w.writer_name,
    komca_code: (w) => w.komca_code,
    song_title: (w) => w.song_title,
    artist: (w) => w.artist,
    domestic_share: (w) => w.domestic_share,
    overseas_share: (w) => w.overseas_share,
    rate: (w) => w.rate,
    recontract_date: (w) => w.recontract_date,
  }, 'pf_sort_works');

  const sorted = useMemo(() => sortRows(works), [works, sortRows]);
  const showWriterCol = selectedWriter === null; // 전체보기일 때만 작가명 컬럼 노출
  const allCount = writers.reduce((s, w) => s + w.count, 0);

  // 작가 패널 항목
  const renderWriterButton = (label: string, count: number, key: string | null) => {
    const active = selectedWriter === key;
    return (
      <button
        key={key ?? '__all__'}
        onClick={() => { setSelectedWriter(key); setAdding(false); }}
        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition cursor-pointer ${
          active
            ? 'bg-primary text-primary-foreground font-semibold shadow-sm'
            : 'text-foreground hover:bg-primary/10'
        }`}
      >
        <span className="truncate">{label}</span>
        <span className={`ml-2 text-xs tabular-nums ${active ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
          {count}
        </span>
      </button>
    );
  };

  const TH_CLASS = 'px-3 py-2 text-center';

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">저작물 DB</h1>
          <p className="text-muted-foreground text-sm">
            전속작가 영구 관리 대상 저작물{!isAdmin && ' · 수정은 관리자만 가능'}
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setAdding((v) => !v)}
            className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition font-medium"
          >
            + 저작물 추가
          </button>
        )}
      </div>

      {/* 신규 추가 폼 */}
      {adding && isAdmin && (
        <div className="bg-card border border-primary/40 rounded-lg p-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 items-end">
          <div>
            <label className="block text-xs text-muted-foreground mb-1">NO.</label>
            <input
              type="number"
              value={form.no}
              onChange={(e) => setForm((f) => ({ ...f, no: e.target.value }))}
              placeholder="예: 165"
              className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg outline-none focus:border-primary text-foreground"
            />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">작가명</label>
            <select
              value={form.writer_name}
              onChange={(e) => setForm((f) => ({ ...f, writer_name: e.target.value }))}
              className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg outline-none focus:border-primary text-foreground"
            >
              <option value="">선택…</option>
              {writers.map((w) => (
                <option key={w.writer_name} value={w.writer_name}>{w.writer_name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">KOMCA 코드</label>
            <input
              type="text"
              value={form.komca_code}
              onChange={(e) => setForm((f) => ({ ...f, komca_code: e.target.value }))}
              className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg outline-none focus:border-primary text-foreground"
            />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">곡명</label>
            <input
              type="text"
              value={form.song_title}
              onChange={(e) => setForm((f) => ({ ...f, song_title: e.target.value }))}
              className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg outline-none focus:border-primary text-foreground"
            />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">아티스트</label>
            <input
              type="text"
              value={form.artist}
              onChange={(e) => setForm((f) => ({ ...f, artist: e.target.value }))}
              className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg outline-none focus:border-primary text-foreground"
            />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">국내 지분(%)</label>
            <input
              type="number" step="any"
              value={form.domestic_share}
              onChange={(e) => setForm((f) => ({ ...f, domestic_share: e.target.value }))}
              className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg outline-none focus:border-primary text-foreground"
            />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">국외 지분(%)</label>
            <input
              type="number" step="any"
              value={form.overseas_share}
              onChange={(e) => setForm((f) => ({ ...f, overseas_share: e.target.value }))}
              className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg outline-none focus:border-primary text-foreground"
            />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">요율</label>
            <input
              type="number" step="any"
              value={form.rate}
              onChange={(e) => setForm((f) => ({ ...f, rate: e.target.value }))}
              className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg outline-none focus:border-primary text-foreground"
            />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">재계약일</label>
            <input
              type="date"
              value={form.recontract_date}
              onChange={(e) => setForm((f) => ({ ...f, recontract_date: e.target.value }))}
              className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg outline-none focus:border-primary text-foreground"
            />
          </div>
          <div className="col-span-2 md:col-span-3 lg:col-span-4 flex justify-end gap-2">
            <button
              onClick={() => { setAdding(false); setForm(EMPTY_FORM); }}
              className="px-4 py-2 text-sm border border-border text-foreground rounded-lg hover:bg-muted transition"
            >
              취소
            </button>
            <button
              onClick={handleAdd}
              className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition"
            >
              추가
            </button>
          </div>
        </div>
      )}

      {/* 본문: 좌측 작가 목록(sticky) + 우측 표 */}
      <div className="grid grid-cols-[180px_1fr] gap-6 items-start">
        {/* 좌측 작가 패널 — 스크롤 시 따라오는 sticky */}
        <aside className="sticky top-6 self-start bg-card border border-border rounded-lg p-2 max-h-[calc(100vh-7rem)] overflow-y-auto transition-all duration-300">
          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">작가</div>
          <div className="space-y-1">
            {renderWriterButton('전체보기', allCount, null)}
            {writers.map((w) => renderWriterButton(w.writer_name, w.count, w.writer_name))}
          </div>
        </aside>

        {/* 우측 표 */}
        <div className="min-w-0">
          {isLoading ? (
            <div className="bg-card border border-border rounded-lg p-8 text-center">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-border border-t-primary mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">데이터 로딩 중...</p>
            </div>
          ) : error ? (
            <div className="bg-card border border-border rounded-lg p-8 text-center">
              <p className="text-red-400">오류: {error}</p>
            </div>
          ) : works.length === 0 ? (
            <div className="bg-card border border-border rounded-lg p-8 text-center">
              <p className="text-muted-foreground">저작물이 없습니다.</p>
            </div>
          ) : (
            <div className="bg-card border border-border rounded-lg overflow-hidden">
              <div className="px-4 py-3 border-b border-border bg-primary/5 flex items-center justify-between">
                <h2 className="text-sm font-bold text-foreground">
                  {selectedWriter ?? '전체보기'}
                </h2>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {selectedWriter ? `${works.length}건` : `${works.length} / ${total}건`}
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs table-fixed min-w-[860px]">
                  <thead className="bg-primary/10 border-b border-border">
                    <tr>
                      <SortableHeader label="NO." sortKey="no" activeKey={sortKey} dir={dir} onSort={toggle} align="center" className={`${TH_CLASS} w-14`} />
                      {showWriterCol && (
                        <SortableHeader label="작가명" sortKey="writer_name" activeKey={sortKey} dir={dir} onSort={toggle} align="center" className={`${TH_CLASS} w-20`} />
                      )}
                      <SortableHeader label="KOMCA 코드" sortKey="komca_code" activeKey={sortKey} dir={dir} onSort={toggle} align="center" className={`${TH_CLASS} w-28`} />
                      <SortableHeader label="곡명" sortKey="song_title" activeKey={sortKey} dir={dir} onSort={toggle} align="center" className={`${TH_CLASS} w-44`} />
                      <SortableHeader label="아티스트" sortKey="artist" activeKey={sortKey} dir={dir} onSort={toggle} align="center" className={`${TH_CLASS} w-36`} />
                      <SortableHeader label="국내지분" sortKey="domestic_share" activeKey={sortKey} dir={dir} onSort={toggle} align="center" className={`${TH_CLASS} w-20`} />
                      <SortableHeader label="국외지분" sortKey="overseas_share" activeKey={sortKey} dir={dir} onSort={toggle} align="center" className={`${TH_CLASS} w-20`} />
                      <SortableHeader label="요율" sortKey="rate" activeKey={sortKey} dir={dir} onSort={toggle} align="center" className={`${TH_CLASS} w-16`} />
                      <SortableHeader label="재계약일" sortKey="recontract_date" activeKey={sortKey} dir={dir} onSort={toggle} align="center" className={`${TH_CLASS} w-28`} />
                      {isAdmin && <th className={`${TH_CLASS} font-bold text-foreground w-16`}>삭제</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {sorted.map((w) => (
                      <tr key={w.id} className="group hover:bg-primary/5 text-center text-foreground">
                        <td className="px-3 py-2 tabular-nums">
                          <EditableCell value={w.no} editable={isAdmin} type="number" onSave={(v) => patchWork(w.id, { no: v as number })} />
                        </td>
                        {showWriterCol && (
                          <td className="px-3 py-2 truncate" title={w.writer_name}>{w.writer_name}</td>
                        )}
                        <td className="px-3 py-2 tabular-nums truncate" title={w.komca_code ?? ''}>
                          <EditableCell value={w.komca_code} editable={isAdmin} type="text" onSave={(v) => patchWork(w.id, { komca_code: v as string | null })} />
                        </td>
                        <td className="px-3 py-2 truncate" title={w.song_title}>
                          <EditableCell value={w.song_title} editable={isAdmin} type="text" onSave={(v) => patchWork(w.id, { song_title: v as string })} />
                        </td>
                        <td className="px-3 py-2 truncate" title={w.artist ?? ''}>
                          <EditableCell value={w.artist} editable={isAdmin} type="text" onSave={(v) => patchWork(w.id, { artist: v as string | null })} />
                        </td>
                        <td className="px-3 py-2 tabular-nums">
                          <EditableCell value={w.domestic_share} editable={isAdmin} type="number" onSave={(v) => patchWork(w.id, { domestic_share: v as number | null })} />
                        </td>
                        <td className="px-3 py-2 tabular-nums">
                          <EditableCell value={w.overseas_share} editable={isAdmin} type="number" onSave={(v) => patchWork(w.id, { overseas_share: v as number | null })} />
                        </td>
                        <td className="px-3 py-2 tabular-nums">
                          <EditableCell value={w.rate} editable={isAdmin} type="number" onSave={(v) => patchWork(w.id, { rate: v as number | null })} />
                        </td>
                        <td className="px-3 py-2 tabular-nums">
                          <EditableCell value={w.recontract_date} editable={isAdmin} type="date" onSave={(v) => patchWork(w.id, { recontract_date: v as string | null })} />
                        </td>
                        {isAdmin && (
                          <td className="px-3 py-2">
                            <button
                              onClick={() => handleDelete(w.id)}
                              className="px-2 py-1 rounded text-[11px] font-medium bg-red-500/20 text-red-400 hover:bg-red-500/30 transition opacity-0 group-hover:opacity-100"
                            >
                              삭제
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* 더보기 (전체보기 전용) */}
              {selectedWriter === null && works.length < total && (
                <div className="p-4 border-t border-border text-center">
                  <button
                    onClick={loadMore}
                    className="px-5 py-2 text-sm border border-border text-foreground rounded-lg hover:bg-muted transition font-medium"
                  >
                    더보기 ({works.length} / {total})
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-foreground text-background text-sm px-4 py-2 rounded-full shadow-lg z-50 pointer-events-none">
          {toast}
        </div>
      )}
    </div>
  );
}
