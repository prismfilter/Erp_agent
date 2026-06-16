'use client';

// 프라이스 테이블 관리 — 카테고리별 그룹, 인라인 수정, 추가, 휴지통(삭제/복구/영구삭제)
// 조회: ADMIN+STAFF / 수정: ADMIN only (API에서 강제)

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useAuthStore } from '@/store/authStore';
import type { PriceItem } from '@/types/invoice';
import { calcFee, calcWriterNet } from '@/lib/invoice/calculator';
import { formatWon } from '@/lib/settlement/calculator';
import { useTableSort } from '@/hooks/useTableSort';
import { SortableHeader } from '@/components/ui/SortableHeader';
import { NumericInput } from '@/components/ui/NumericInput';

const CATEGORIES = ['앨범', '방송·공연·시상식', '광고', '기타', '밴드(플레디스)', '밴드'];

// 금액 인라인 편집 셀
function AmountCell({
  value,
  editable,
  onSave,
}: {
  value: number | null;
  editable: boolean;
  onSave: (v: number | null) => Promise<void>;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(value?.toString() ?? '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(draft === '' ? null : Number(draft));
      setIsEditing(false);
    } finally {
      setSaving(false);
    }
  };

  if (!editable) {
    return <span className="tabular-nums">{value != null ? formatWon(value) : '-'}</span>;
  }

  if (isEditing) {
    return (
      <NumericInput
        value={draft === '' ? 0 : Number(draft)}
        onChange={(v) => setDraft(v === 0 ? '' : String(v))}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleSave();
          if (e.key === 'Escape') setIsEditing(false);
        }}
        onBlur={handleSave}
        autoFocus
        disabled={saving}
        className="w-24 px-2 py-1 text-xs text-center bg-background border border-primary rounded outline-none text-foreground tabular-nums"
      />
    );
  }

  return (
    <button
      onClick={() => { setDraft(value?.toString() ?? ''); setIsEditing(true); }}
      className="tabular-nums hover:text-primary transition cursor-pointer"
      title="클릭하여 수정"
    >
      {value != null ? formatWon(value) : '-'}
    </button>
  );
}

export default function PriceTablePage() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN';

  const [items, setItems] = useState<PriceItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showInactive, setShowInactive] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  // 휴지통 보기 / 선택 / 삭제 선택지
  const [viewTrash, setViewTrash] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleteChoice, setDeleteChoice] = useState(false);
  // 신규 추가 폼
  const [adding, setAdding] = useState(false);
  const [newCategory, setNewCategory] = useState(CATEGORIES[0]);
  const [newName, setNewName] = useState('');
  const [newBilling, setNewBilling] = useState('');
  const [newWriterPay, setNewWriterPay] = useState('');

  const fetchItems = useCallback(async () => {
    try {
      const res = await fetch(`/api/price-items?${viewTrash ? 'trash=1' : 'all=1'}`);
      if (!res.ok) throw new Error('목록을 불러올 수 없습니다.');
      setItems((await res.json()).priceItems || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [viewTrash]);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- async fetch라 setState는 마이크로태스크에서 실행 (동기 cascading render 아님)
  useEffect(() => { fetchItems(); }, [fetchItems]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  };

  const patchItem = async (id: string, patch: Partial<PriceItem>) => {
    const res = await fetch(`/api/price-items/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    if (res.ok) {
      const { priceItem } = await res.json();
      setItems((prev) => prev.map((it) => (it.id === id ? priceItem : it)));
      showToast('저장 완료');
    } else {
      showToast((await res.json()).error || '저장 실패');
    }
  };

  const handleAdd = async () => {
    if (!newName.trim()) { showToast('작업내역명을 입력하세요'); return; }
    const res = await fetch('/api/price-items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        category: newCategory,
        name: newName.trim(),
        billing_price: newBilling === '' ? null : Number(newBilling),
        writer_base_pay: newWriterPay === '' ? null : Number(newWriterPay),
      }),
    });
    if (res.ok) {
      setAdding(false);
      setNewName(''); setNewBilling(''); setNewWriterPay('');
      fetchItems();
      showToast('항목 추가 완료');
    } else {
      showToast((await res.json()).error || '추가 실패');
    }
  };

  // ── 선택 토글 ──
  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleMany = (ids: string[], checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => (checked ? next.add(id) : next.delete(id)));
      return next;
    });
  };

  const clearSelection = () => { setSelected(new Set()); setDeleteChoice(false); };

  // ── 일괄/단건 작업 ──
  const runBulk = async (ids: string[], fn: (id: string) => Promise<Response>, doneMsg: string) => {
    const results = await Promise.all(ids.map(fn));
    const ok = results.filter((r) => r.ok).length;
    clearSelection();
    await fetchItems();
    showToast(`${doneMsg} (${ok}/${ids.length})`);
  };

  const moveToTrash = (ids: string[]) =>
    runBulk(ids, (id) => fetch(`/api/price-items/${id}`, { method: 'DELETE' }), '휴지통으로 이동');

  const permanentDelete = (ids: string[]) =>
    runBulk(ids, (id) => fetch(`/api/price-items/${id}?permanent=1`, { method: 'DELETE' }), '영구 삭제');

  const restore = (ids: string[]) =>
    runBulk(
      ids,
      (id) => fetch(`/api/price-items/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deleted_at: null }),
      }),
      '복구',
    );

  const emptyTrash = async () => {
    const res = await fetch('/api/price-items/empty-trash', { method: 'POST' });
    clearSelection();
    await fetchItems();
    showToast(res.ok ? '휴지통을 비웠습니다' : '비우기 실패');
  };

  // 정렬: 작업내역·희망청구가·작가지급액·관리수수료·실수령액 (카테고리 그룹 내부 정렬)
  const { sortKey, dir, toggle, sortRows } = useTableSort<PriceItem>({
    name: (it) => it.name,
    billing_price: (it) => it.billing_price,
    writer_base_pay: (it) => it.writer_base_pay,
    fee: (it) => (it.writer_base_pay != null ? calcFee(it.writer_base_pay, it.fee_rate) : null),
    net: (it) => (it.writer_base_pay != null ? calcWriterNet(it.writer_base_pay, it.fee_rate) : null),
  }, 'pf_sort_price_table');

  // 카테고리별 그룹핑 + 그룹 내부 정렬
  const grouped = useMemo(() => {
    const visible = viewTrash
      ? items
      : showInactive
        ? items
        : items.filter((it) => it.is_active);
    const groups = new Map<string, PriceItem[]>();
    visible.forEach((it) => {
      if (!groups.has(it.category)) groups.set(it.category, []);
      groups.get(it.category)!.push(it);
    });
    return Array.from(groups.entries()).map(
      ([cat, arr]) => [cat, sortRows(arr)] as [string, PriceItem[]]
    );
  }, [items, showInactive, viewTrash, sortRows]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            프라이스 테이블{viewTrash && ' · 휴지통'}
          </h1>
          <p className="text-muted-foreground text-sm">
            {viewTrash
              ? '삭제된 항목 · 30일 후 자동 영구삭제'
              : '2025년 개편안 단가 기준 · 수수료는 작가지급액의 20%'}
            {!isAdmin && ' · 수정은 관리자만 가능'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {!viewTrash && (
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={showInactive}
                onChange={(e) => setShowInactive(e.target.checked)}
                className="accent-[var(--primary)]"
              />
              비활성 항목 표시
            </label>
          )}
          {isAdmin && !viewTrash && (
            <button
              onClick={() => setAdding((v) => !v)}
              className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition font-medium"
            >
              + 항목 추가
            </button>
          )}
          {isAdmin && (
            <button
              onClick={() => { setViewTrash((v) => !v); clearSelection(); }}
              className={`px-4 py-2 text-sm rounded-lg transition font-medium border ${
                viewTrash
                  ? 'border-primary text-primary hover:bg-primary/10'
                  : 'border-border text-foreground hover:bg-muted'
              }`}
            >
              {viewTrash ? '← 목록으로' : '🗑 휴지통'}
            </button>
          )}
          {isAdmin && viewTrash && (
            <button
              onClick={emptyTrash}
              className="px-4 py-2 text-sm bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition font-medium"
            >
              휴지통 비우기
            </button>
          )}
        </div>
      </div>

      {/* 선택 액션 바 */}
      {isAdmin && selected.size > 0 && (
        <div className="bg-card border border-primary/40 rounded-lg px-4 py-3 flex flex-wrap items-center gap-3">
          <span className="text-sm font-medium text-foreground">선택 {selected.size}건</span>
          {viewTrash ? (
            <>
              <button
                onClick={() => restore(Array.from(selected))}
                className="px-3 py-1.5 text-xs bg-primary/15 text-primary rounded-lg hover:bg-primary/25 transition font-medium"
              >
                복구
              </button>
              <button
                onClick={() => permanentDelete(Array.from(selected))}
                className="px-3 py-1.5 text-xs bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition font-medium"
              >
                영구 삭제
              </button>
            </>
          ) : deleteChoice ? (
            <>
              <button
                onClick={() => moveToTrash(Array.from(selected))}
                className="px-3 py-1.5 text-xs bg-amber-500/20 text-amber-500 rounded-lg hover:bg-amber-500/30 transition font-medium"
              >
                휴지통으로 이동
              </button>
              <button
                onClick={() => permanentDelete(Array.from(selected))}
                className="px-3 py-1.5 text-xs bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition font-medium"
              >
                영구 삭제
              </button>
              <button
                onClick={() => setDeleteChoice(false)}
                className="px-3 py-1.5 text-xs bg-gray-500/20 text-gray-400 rounded-lg hover:bg-gray-500/30 transition font-medium"
              >
                취소
              </button>
            </>
          ) : (
            <button
              onClick={() => setDeleteChoice(true)}
              className="px-3 py-1.5 text-xs bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition font-medium"
            >
              삭제
            </button>
          )}
          <button
            onClick={clearSelection}
            className="ml-auto text-xs text-muted-foreground hover:text-foreground transition"
          >
            선택 해제
          </button>
        </div>
      )}

      {/* 신규 추가 폼 */}
      {adding && !viewTrash && (
        <div className="bg-card border border-primary/40 rounded-lg p-4 flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs text-muted-foreground mb-1">카테고리</label>
            <select
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              className="px-3 py-2 text-sm bg-background border border-border rounded-lg outline-none text-foreground"
            >
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs text-muted-foreground mb-1">작업내역명</label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg outline-none focus:border-primary text-foreground"
            />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">희망청구가</label>
            <NumericInput
              value={newBilling === '' ? 0 : Number(newBilling)}
              onChange={(v) => setNewBilling(v === 0 ? '' : String(v))}
              className="w-32 px-3 py-2 text-sm bg-background border border-border rounded-lg outline-none focus:border-primary text-foreground tabular-nums"
            />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">작가지급액</label>
            <NumericInput
              value={newWriterPay === '' ? 0 : Number(newWriterPay)}
              onChange={(v) => setNewWriterPay(v === 0 ? '' : String(v))}
              className="w-32 px-3 py-2 text-sm bg-background border border-border rounded-lg outline-none focus:border-primary text-foreground tabular-nums"
            />
          </div>
          <button
            onClick={handleAdd}
            className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition"
          >
            추가
          </button>
        </div>
      )}

      {/* 카테고리별 테이블 */}
      {isLoading ? (
        <div className="bg-card border border-border rounded-lg p-8 text-center">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-border border-t-primary mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">데이터 로딩 중...</p>
        </div>
      ) : error ? (
        <div className="bg-card border border-border rounded-lg p-8 text-center">
          <p className="text-red-400">오류: {error}</p>
        </div>
      ) : grouped.length === 0 ? (
        <div className="bg-card border border-border rounded-lg p-8 text-center">
          <p className="text-muted-foreground">
            {viewTrash ? '휴지통이 비어 있습니다.' : '항목이 없습니다.'}
          </p>
        </div>
      ) : (
        grouped.map(([category, categoryItems]) => {
          const ids = categoryItems.map((it) => it.id);
          const allSelected = ids.length > 0 && ids.every((id) => selected.has(id));
          const someSelected = ids.some((id) => selected.has(id));
          return (
          <div key={category} className="bg-card border border-border rounded-lg overflow-hidden w-full max-w-[1060px] mx-auto">
            <div className="px-4 py-3 border-b border-border bg-primary/5">
              <h2 className="text-sm font-bold text-foreground text-center">{category}</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs table-fixed min-w-[980px]">
                <thead className="bg-primary/10 border-b border-border">
                  <tr className="group">
                    {isAdmin && (
                      <th className="px-3 py-2 w-10 text-center">
                        <input
                          type="checkbox"
                          checked={allSelected}
                          onChange={(e) => toggleMany(ids, e.target.checked)}
                          className={`accent-[var(--primary)] cursor-pointer transition-opacity ${
                            someSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                          }`}
                          aria-label={`${category} 전체 선택`}
                        />
                      </th>
                    )}
                    <SortableHeader label="작업내역" sortKey="name" activeKey={sortKey} dir={dir} onSort={toggle} className="px-3 py-2 w-[320px]" />
                    <SortableHeader label="희망청구가" sortKey="billing_price" activeKey={sortKey} dir={dir} onSort={toggle} align="center" className="px-3 py-2 w-32" />
                    <SortableHeader label="작가지급액 (방어선)" sortKey="writer_base_pay" activeKey={sortKey} dir={dir} onSort={toggle} align="center" className="px-3 py-2 w-36" />
                    <SortableHeader label="관리 수수료 (20%)" sortKey="fee" activeKey={sortKey} dir={dir} onSort={toggle} align="center" className="px-3 py-2 w-36" />
                    <SortableHeader label="작가 실수령액" sortKey="net" activeKey={sortKey} dir={dir} onSort={toggle} align="center" className="px-3 py-2 w-32" />
                    {isAdmin && <th className="px-3 py-2 text-center font-bold text-foreground w-28">{viewTrash ? '액션' : '상태'}</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {categoryItems.map((it) => (
                    <tr key={it.id} className={`group hover:bg-primary/5 ${!it.is_active && !viewTrash ? 'opacity-40' : ''} ${selected.has(it.id) ? 'bg-primary/5' : ''}`}>
                      {isAdmin && (
                        <td className="px-3 py-2 text-center">
                          <input
                            type="checkbox"
                            checked={selected.has(it.id)}
                            onChange={() => toggleOne(it.id)}
                            className={`accent-[var(--primary)] cursor-pointer transition-opacity ${
                              selected.has(it.id) ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                            }`}
                            aria-label={`${it.name} 선택`}
                          />
                        </td>
                      )}
                      <td className="px-3 py-2 text-foreground w-[320px] truncate" title={it.name}>
                        {it.name}
                        {it.is_formula && (
                          <span className="ml-2 text-amber-400 cursor-help" title={it.formula_note ?? '수식형 항목'}>
                            ⓘ 수식
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-center text-foreground whitespace-nowrap">
                        {it.is_formula ? (
                          <span className="text-muted-foreground text-[11px]">{it.formula_note ?? '협의'}</span>
                        ) : (
                          <AmountCell
                            value={it.billing_price}
                            editable={isAdmin && !viewTrash}
                            onSave={(v) => patchItem(it.id, { billing_price: v })}
                          />
                        )}
                      </td>
                      <td className="px-3 py-2 text-center text-foreground whitespace-nowrap">
                        {it.is_formula ? (
                          <span className="text-muted-foreground">-</span>
                        ) : (
                          <AmountCell
                            value={it.writer_base_pay}
                            editable={isAdmin && !viewTrash}
                            onSave={(v) => patchItem(it.id, { writer_base_pay: v })}
                          />
                        )}
                      </td>
                      <td className="px-3 py-2 text-center text-muted-foreground tabular-nums whitespace-nowrap">
                        {it.writer_base_pay != null ? formatWon(calcFee(it.writer_base_pay, it.fee_rate)) : '-'}
                      </td>
                      <td className="px-3 py-2 text-center text-green-500 tabular-nums whitespace-nowrap">
                        {it.writer_base_pay != null ? formatWon(calcWriterNet(it.writer_base_pay, it.fee_rate)) : '-'}
                      </td>
                      {isAdmin && (
                        <td className="px-3 py-2 text-center">
                          {viewTrash ? (
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => restore([it.id])}
                                className="px-2 py-1 rounded text-[11px] font-medium bg-primary/15 text-primary hover:bg-primary/25 transition"
                              >
                                복구
                              </button>
                              <button
                                onClick={() => permanentDelete([it.id])}
                                className="px-2 py-1 rounded text-[11px] font-medium bg-red-500/20 text-red-400 hover:bg-red-500/30 transition"
                              >
                                영구삭제
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => patchItem(it.id, { is_active: !it.is_active })}
                              className={`px-2 py-1 rounded text-[11px] font-medium transition whitespace-nowrap ${
                                it.is_active
                                  ? 'bg-green-500/20 text-green-400 hover:bg-red-500/20 hover:text-red-400'
                                  : 'bg-gray-500/20 text-gray-400 hover:bg-green-500/20 hover:text-green-400'
                              }`}
                              title={it.is_active ? '클릭하여 비활성화' : '클릭하여 활성화'}
                            >
                              {it.is_active ? '사용 중' : '비활성'}
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          );
        })
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-foreground text-background text-sm px-4 py-2 rounded-full shadow-lg z-50 pointer-events-none">
          {toast}
        </div>
      )}
    </div>
  );
}
