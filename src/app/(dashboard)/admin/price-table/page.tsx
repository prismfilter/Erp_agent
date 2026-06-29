'use client';

// 프라이스 테이블 관리 — 카테고리별 그룹, 인라인 수정, 추가, 휴지통(삭제/복구/영구삭제)
// 조회: ADMIN+STAFF / 수정: ADMIN only (API에서 강제)

import { useEffect, useState, useCallback, useMemo } from 'react';
import { Trash2 } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useRowFocus } from '@/hooks/useRowFocus';
import type { PriceItem } from '@/types/invoice';
import { feeRateForCategory, calcFee, calcWriterNet } from '@/lib/invoice/calculator';
import { formatWon } from '@/lib/settlement/calculator';
import { useTableSort } from '@/hooks/useTableSort';
import { SortableHeader } from '@/components/ui/SortableHeader';
import { NumericInput } from '@/components/ui/NumericInput';
import { PageHeader } from '@/components/layout/PageHeader';

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
  const [toast, setToast] = useState<string | null>(null);
  // 휴지통 보기 / 행 삭제 확인(작가 마스터 패턴)
  const [viewTrash, setViewTrash] = useState(false);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  // 신규 추가 폼 (작가지급액 입력 제거)
  const [adding, setAdding] = useState(false);
  const [newCategory, setNewCategory] = useState(CATEGORIES[0]);
  const [newName, setNewName] = useState('');
  const [newBilling, setNewBilling] = useState('');

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

  // 추가폼 입력 리셋 (추가 완료/취소 공용)
  const resetAddForm = () => {
    setAdding(false);
    setNewCategory(CATEGORIES[0]);
    setNewName('');
    setNewBilling('');
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
        // writer_base_pay 미전송 — 실수령은 fee_rate(카테고리) 기준 자동계산
      }),
    });
    if (res.ok) {
      resetAddForm();
      fetchItems();
      showToast('항목 추가 완료');
    } else {
      showToast((await res.json()).error || '추가 실패');
    }
  };

  // ── 단건 작업: 완료 후 목록 새로고침 + 토스트 ──
  const runOne = async (req: Promise<Response>, doneMsg: string) => {
    const res = await req;
    setConfirmingId(null);
    await fetchItems();
    showToast(res.ok ? doneMsg : '작업 실패');
  };

  const moveToTrash = (id: string) =>
    runOne(fetch(`/api/price-items/${id}`, { method: 'DELETE' }), '휴지통으로 이동');

  const permanentDelete = (id: string) =>
    runOne(fetch(`/api/price-items/${id}?permanent=1`, { method: 'DELETE' }), '영구 삭제');

  const restore = (id: string) =>
    runOne(
      fetch(`/api/price-items/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deleted_at: null }),
      }),
      '복구',
    );

  const emptyTrash = async () => {
    const res = await fetch('/api/price-items/empty-trash', { method: 'POST' });
    setConfirmingId(null);
    await fetchItems();
    showToast(res.ok ? '휴지통을 비웠습니다' : '비우기 실패');
  };

  // 정렬: 작업내역·희망청구가·수수료·실수령액 (카테고리 그룹 내부 정렬)
  const { sortKey, dir, toggle, sortRows } = useTableSort<PriceItem>({
    name: (it) => it.name,
    billing_price: (it) => it.billing_price,
    fee: (it) =>
      it.billing_price != null ? calcFee(it.billing_price, feeRateForCategory(it.category)) : null,
    net: (it) =>
      it.billing_price != null ? calcWriterNet(it.billing_price, feeRateForCategory(it.category)) : null,
  }, 'pf_sort_price_table');

  // 카테고리별 그룹핑 + 그룹 내부 정렬 (목록/휴지통은 fetch 단계에서 분리됨)
  const grouped = useMemo(() => {
    const groups = new Map<string, PriceItem[]>();
    items.forEach((it) => {
      if (!groups.has(it.category)) groups.set(it.category, []);
      groups.get(it.category)!.push(it);
    });
    return Array.from(groups.entries()).map(
      ([cat, arr]) => [cat, sortRows(arr)] as [string, PriceItem[]]
    );
  }, [items, sortRows]);

  // 검색으로 진입 시 해당 프라이스 항목 행으로 스크롤 + 하이라이트
  useRowFocus(!isLoading && items.length > 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title={`용역 단가${viewTrash ? ' · 휴지통' : ''}`}
        description={
          <>
            {viewTrash
              ? '삭제된 항목 · 30일 후 자동 영구삭제'
              : '2026년 개편안 단가 기준 · 수수료는 희망청구가 기준 · 밴드 20% / 그 외 30%'}
            {!isAdmin && ' · 수정은 관리자만 가능'}
          </>
        }
        actions={
          isAdmin && (
            <>
              {!viewTrash && (
                <button
                  onClick={() => setAdding((v) => !v)}
                  className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition font-medium"
                >
                  + 항목 추가
                </button>
              )}
              <button
                onClick={() => { setViewTrash((v) => !v); setConfirmingId(null); }}
                className={`px-4 py-2 text-sm rounded-lg transition font-medium border ${
                  viewTrash
                    ? 'border-primary text-primary hover:bg-primary/10'
                    : 'border-border text-foreground hover:bg-muted'
                }`}
              >
                {viewTrash ? '← 목록으로' : <span className="inline-flex items-center gap-1.5"><Trash2 className="w-4 h-4" /> 휴지통</span>}
              </button>
              {viewTrash && (
                <button
                  onClick={emptyTrash}
                  className="px-4 py-2 text-sm bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition font-medium"
                >
                  휴지통 비우기
                </button>
              )}
            </>
          )
        }
      />

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
          <button
            onClick={handleAdd}
            className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition cursor-pointer"
          >
            추가
          </button>
          <button
            onClick={resetAddForm}
            className="px-4 py-2 text-sm border border-border text-foreground rounded-lg hover:bg-muted transition cursor-pointer"
          >
            취소
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
          // 그룹(카테고리) 수수료 라벨: 밴드 계열 20% / 그 외 30%
          const feeLabel = feeRateForCategory(category) === 0.2 ? '밴드 수수료 (20%)' : '관리 수수료 (30%)';
          return (
          <div key={category} className="bg-card border border-border rounded-lg overflow-hidden w-full max-w-[1060px] mx-auto">
            <div className="px-4 py-3 border-b border-border bg-primary/5">
              <h2 className="text-sm font-bold text-foreground text-center">{category}</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs table-fixed min-w-[980px]">
                <thead className="bg-primary/10 border-b border-border">
                  <tr className="group">
                    <SortableHeader label="작업내역" sortKey="name" activeKey={sortKey} dir={dir} onSort={toggle} className="px-3 py-2 w-[360px]" />
                    <SortableHeader label="희망청구가" sortKey="billing_price" activeKey={sortKey} dir={dir} onSort={toggle} align="center" className="px-3 py-2 w-36" />
                    <SortableHeader label={feeLabel} sortKey="fee" activeKey={sortKey} dir={dir} onSort={toggle} align="center" className="px-3 py-2 w-40" />
                    <SortableHeader label="작가 실수령액" sortKey="net" activeKey={sortKey} dir={dir} onSort={toggle} align="center" className="px-3 py-2 w-36" />
                    {isAdmin && <th className="px-3 py-2 text-center font-bold text-foreground w-28">액션</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {categoryItems.map((it) => {
                    // 수수료/실수령은 희망청구가 × 카테고리 수수료율로 자동계산 (수식형은 '-')
                    const feeRate = feeRateForCategory(it.category);
                    const fee = it.billing_price != null ? calcFee(it.billing_price, feeRate) : null;
                    const net = it.billing_price != null ? calcWriterNet(it.billing_price, feeRate) : null;
                    return (
                    <tr key={it.id} id={`row-${it.id}`} className="group hover:bg-primary/5">
                      <td className="px-3 py-2 text-foreground w-[360px] truncate" title={it.name}>
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
                      <td className="px-3 py-2 text-center text-muted-foreground tabular-nums whitespace-nowrap">
                        {fee != null ? formatWon(fee) : '-'}
                      </td>
                      <td className="px-3 py-2 text-center text-green-500 tabular-nums whitespace-nowrap">
                        {net != null ? formatWon(net) : '-'}
                      </td>
                      {isAdmin && (
                        <td className="px-3 py-2 text-center">
                          {viewTrash ? (
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => restore(it.id)}
                                className="px-2 py-1 rounded text-[11px] font-medium bg-primary/15 text-primary hover:bg-primary/25 transition cursor-pointer"
                              >
                                복구
                              </button>
                              <button
                                onClick={() => permanentDelete(it.id)}
                                className="px-2 py-1 rounded text-[11px] font-medium bg-red-500/20 text-red-400 hover:bg-red-500/30 transition cursor-pointer"
                              >
                                영구삭제
                              </button>
                            </div>
                          ) : confirmingId === it.id ? (
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => moveToTrash(it.id)}
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
                              onClick={() => setConfirmingId(it.id)}
                              className="p-1.5 text-muted-foreground hover:text-red-400 transition rounded hover:bg-red-500/10 cursor-pointer"
                              title="삭제(휴지통 이동)"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                    );
                  })}
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
