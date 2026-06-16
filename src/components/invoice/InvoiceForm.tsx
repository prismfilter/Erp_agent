'use client';

// 청구서 작성/수정 폼 — 항목 자동입력·협의가·할인·커스텀·내부 행 분리

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { PriceItem, Client, CompanyAccount, Invoice, InvoiceItem, Writer } from '@/types/invoice';
import { calcInvoiceTotals, calcItemBreakdown } from '@/lib/invoice/calculator';
import { formatWon } from '@/lib/settlement/calculator';
import { PriceItemSelect } from './PriceItemSelect';
import { WriterSelect } from './WriterSelect';
import { PercentCell } from './PercentCell';
import { NumericInput } from '@/components/ui/NumericInput';
import { DatePicker } from '@/components/ui/DatePicker';

interface InvoiceFormProps {
  invoice?: Invoice; // 수정 모드일 때 전달
}

// 새 행 기본값
function newItem(no: number): InvoiceItem {
  return {
    id: crypto.randomUUID(), // 클라이언트 임시 키 (group_key 매핑용)
    no,
    price_item_id: null,
    description: '',
    writer_names: '',
    supply_amount: 0,
    discount_amount: 0,
    writer_pay_rate: 70, // 작가수수료율 기본 70%
    writer_pay: 0,
    item_type: 'custom',
    is_negotiated: false,
    note: null,
    show_in_external: true,
    group_key: null,
  };
}

export function InvoiceForm({ invoice }: InvoiceFormProps) {
  const router = useRouter();
  const isEdit = !!invoice;

  // 마스터 데이터
  const [priceItems, setPriceItems] = useState<PriceItem[]>([]);
  const [writers, setWriters] = useState<Writer[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [accounts, setAccounts] = useState<CompanyAccount[]>([]);

  // 헤더 상태
  const [invoiceDate, setInvoiceDate] = useState(invoice?.invoice_date ?? new Date().toISOString().slice(0, 10));
  const [clientName, setClientName] = useState(invoice?.client?.name ?? '');
  const [title, setTitle] = useState(invoice?.title ?? '');
  const [accountText, setAccountText] = useState(
    invoice?.account ? `${invoice.account.bank_name} ${invoice.account.account_number}` : ''
  );
  const [memo, setMemo] = useState(invoice?.memo ?? '');

  // 라인 항목
  const [items, setItems] = useState<InvoiceItem[]>(
    invoice?.items?.length ? invoice.items : [newItem(1)]
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showClientSuggest, setShowClientSuggest] = useState(false);
  const [showAccountSuggest, setShowAccountSuggest] = useState(false);

  // 마스터 데이터 로드
  useEffect(() => {
    (async () => {
      const [pRes, wRes, cRes, aRes] = await Promise.all([
        fetch('/api/price-items'),
        fetch('/api/writers'),
        fetch('/api/clients'),
        fetch('/api/company-accounts'),
      ]);
      if (pRes.ok) setPriceItems((await pRes.json()).priceItems || []);
      if (wRes.ok) setWriters((await wRes.json()).writers || []);
      if (cRes.ok) setClients((await cRes.json()).clients || []);
      if (aRes.ok) {
        const accs: CompanyAccount[] = (await aRes.json()).accounts || [];
        setAccounts(accs);
        // 신규 작성 시 기본 계좌(입금계좌) 자동 입력
        if (!invoice && accs.length > 0) {
          const def = accs.find((a) => a.is_default) ?? accs[0];
          setAccountText(`${def.bank_name} ${def.account_number}`);
        }
      }
    })();
  }, [invoice]);

  // 실시간 합계
  const totals = useMemo(() => calcInvoiceTotals(items), [items]);

  // 자식이 있는 부모 id 집합 (작가지급액 입력 비활성화용)
  const parentIdsWithChildren = useMemo(
    () =>
      new Set(
        items
          .map((it) => it.group_key)
          .filter((key): key is string => key != null)
      ),
    [items]
  );

  // 거래처 자동완성 후보
  const clientSuggestions = useMemo(() => {
    const q = clientName.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter((c) => c.name.toLowerCase().includes(q));
  }, [clients, clientName]);

  // 행 업데이트 헬퍼
  const updateItem = useCallback((id: string, patch: Partial<InvoiceItem>) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  }, []);

  // 순번 재계산 (외부 표시 행 기준 번호 — 자식 행은 부모 아래 위치)
  const renumber = useCallback((list: InvoiceItem[]): InvoiceItem[] => {
    let n = 0;
    return list.map((it) => {
      n += 1;
      return { ...it, no: n };
    });
  }, []);

  // 프라이스 항목 선택 → 자동 입력
  const handlePriceSelect = useCallback(
    (itemId: string, p: PriceItem | null) => {
      setItems((prev) =>
        prev.map((it) => {
          if (it.id !== itemId) return it;
          if (!p) {
            // 커스텀 전환
            return { ...it, price_item_id: null, item_type: it.item_type === 'discount' ? 'discount' : 'custom', is_negotiated: false };
          }
          return {
            ...it,
            price_item_id: p.id,
            item_type: 'normal',
            is_negotiated: false,
            // 수식형은 금액 자동입력 없음. 공급가액만 자동입력, 작가수수료율은 기존값 유지
            supply_amount: p.is_formula ? it.supply_amount : (p.billing_price ?? 0),
            // 상세내용 자동 생성: {거래명}_{항목명} (이미 입력했으면 유지)
            description: it.description.trim() ? it.description : (title ? `${title}_${p.name}` : p.name),
          };
        })
      );
    },
    [title]
  );

  // 공급가액 수정 → 프라이스 기본 단가와 다르면 협의가 플래그
  const handleSupplyChange = useCallback(
    (itemId: string, value: number) => {
      setItems((prev) =>
        prev.map((it) => {
          if (it.id !== itemId) return it;
          const p = priceItems.find((pp) => pp.id === it.price_item_id);
          let negotiated = it.is_negotiated;
          if (p && !p.is_formula && p.billing_price != null && value !== p.billing_price) {
            negotiated = true;
          }
          return { ...it, supply_amount: value, is_negotiated: negotiated };
        })
      );
    },
    [priceItems]
  );

  // 행 추가/삭제/복제/이동/분리
  const addRow = () => setItems((prev) => renumber([...prev, newItem(prev.length + 1)]));

  const removeRow = (id: string) =>
    setItems((prev) => renumber(prev.filter((it) => it.id !== id && it.group_key !== id)));

  const duplicateRow = (id: string) =>
    setItems((prev) => {
      const idx = prev.findIndex((it) => it.id === id);
      if (idx < 0) return prev;
      const copy = { ...prev[idx], id: crypto.randomUUID(), group_key: prev[idx].group_key };
      const next = [...prev];
      next.splice(idx + 1, 0, copy);
      return renumber(next);
    });

  const moveRow = (id: string, dir: -1 | 1) =>
    setItems((prev) => {
      const idx = prev.findIndex((it) => it.id === id);
      const target = idx + dir;
      if (idx < 0 || target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[target]] = [next[target], next[idx]];
      return renumber(next);
    });

  // 내부 행 분리: 부모 아래 내부 전용 자식 행 추가
  const addSplitRow = (parentId: string) =>
    setItems((prev) => {
      const idx = prev.findIndex((it) => it.id === parentId);
      if (idx < 0) return prev;
      // 마지막 자식 위치 탐색
      let insertAt = idx + 1;
      while (insertAt < prev.length && prev[insertAt].group_key === parentId) insertAt += 1;
      const parent = prev[idx];
      const child: InvoiceItem = {
        ...newItem(0),
        group_key: parentId,
        show_in_external: false,
        item_type: 'normal',
        description: parent.description,
        price_item_id: null,
      };
      const next = [...prev];
      next.splice(insertAt, 0, child);
      return renumber(next);
    });

  // 저장
  const handleSave = async () => {
    if (!title.trim()) { setError('거래명을 입력하세요.'); return; }
    if (!invoiceDate) { setError('날짜를 선택하세요.'); return; }

    setSaving(true);
    setError(null);

    try {
      // 거래처: 이름으로 조회/생성
      let clientId: string | null = null;
      if (clientName.trim()) {
        const cRes = await fetch('/api/clients', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: clientName.trim() }),
        });
        if (cRes.ok) clientId = (await cRes.json()).client?.id ?? null;
      }

      // 입금계좌: "은행명 계좌번호" 문자열을 첫 공백 기준으로 분리 → 조회/등록
      let accountId: string | null = null;
      const acc = accountText.trim();
      const sp = acc.indexOf(' ');
      const bankName = sp > 0 ? acc.slice(0, sp) : acc;
      const accNumber = sp > 0 ? acc.slice(sp + 1).trim() : '';
      if (bankName && accNumber) {
        const aRes = await fetch('/api/company-accounts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bank_name: bankName, account_number: accNumber }),
        });
        if (aRes.ok) accountId = (await aRes.json()).account?.id ?? null;
      }

      const payload = {
        invoice_date: invoiceDate,
        client_id: clientId,
        title: title.trim(),
        account_id: accountId,
        memo: memo || null,
        items,
      };

      const res = await fetch(isEdit ? `/api/invoices/${invoice!.id}` : '/api/invoices', {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || '저장 실패');
      }

      const savedId = isEdit ? invoice!.id : (await res.json()).invoice.id;
      router.push(`/invoices/${savedId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : '저장 중 오류가 발생했습니다.');
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 헤더 입력 영역 */}
      <div className="bg-card border border-border rounded-lg p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[max-content_1fr_1.4fr_1.2fr] gap-4 items-start">
        <div>
          <label className="block text-xs font-semibold text-muted-foreground mb-1.5">날짜 *</label>
          <DatePicker
            value={invoiceDate}
            onChange={setInvoiceDate}
            className="w-40 flex items-center justify-between gap-2 px-3 py-2 text-sm bg-background border border-border rounded-lg outline-none hover:border-primary/50 focus:border-primary text-foreground"
          />
        </div>
        <div className="relative">
          <label className="block text-xs font-semibold text-muted-foreground mb-1.5">거래처</label>
          <input
            type="text"
            value={clientName}
            onChange={(e) => { setClientName(e.target.value); setShowClientSuggest(true); }}
            onFocus={() => setShowClientSuggest(true)}
            onBlur={() => setTimeout(() => setShowClientSuggest(false), 150)}
            placeholder="거래처명 (신규 자동 등록)"
            className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg outline-none focus:border-primary text-foreground"
          />
          {showClientSuggest && clientSuggestions.length > 0 && (
            <div className="absolute z-40 mt-1 w-full bg-card border border-border rounded-lg shadow-xl max-h-48 overflow-y-auto">
              {clientSuggestions.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onMouseDown={() => { setClientName(c.name); setShowClientSuggest(false); }}
                  className="w-full px-3 py-2 text-xs text-left hover:bg-primary/10 text-foreground"
                >
                  {c.name}
                </button>
              ))}
            </div>
          )}
        </div>
        <div>
          <label className="block text-xs font-semibold text-muted-foreground mb-1.5">거래명 *</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="예: SVT 2026 ON STAGE 음원제작"
            className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg outline-none focus:border-primary text-foreground"
          />
        </div>
        <div className="relative">
          <label className="block text-xs font-semibold text-muted-foreground mb-1.5">입금계좌</label>
          <input
            type="text"
            value={accountText}
            onChange={(e) => { setAccountText(e.target.value); setShowAccountSuggest(true); }}
            onFocus={() => setShowAccountSuggest(true)}
            onBlur={() => setTimeout(() => setShowAccountSuggest(false), 150)}
            placeholder="예: 신한은행 140-016-071366"
            className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg outline-none focus:border-primary text-foreground tabular-nums"
          />
          {showAccountSuggest && accounts.length > 0 && (
            <div className="absolute z-40 mt-1 w-full bg-card border border-border rounded-lg shadow-xl max-h-48 overflow-y-auto">
              {accounts.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onMouseDown={() => {
                    setAccountText(`${a.bank_name} ${a.account_number}`);
                    setShowAccountSuggest(false);
                  }}
                  className="w-full px-3 py-2 text-xs text-left hover:bg-primary/10 text-foreground"
                >
                  {a.bank_name} <span className="text-muted-foreground tabular-nums">{a.account_number}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 라인 항목 테이블 */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">작업 항목</h2>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={addRow}
              className="px-3 py-1.5 text-xs bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition"
            >
              + 항목 추가
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs invoice-line-table">
            <thead className="bg-primary/10 border-b border-border">
              <tr>
                <th className="px-2 py-2.5 text-center font-bold text-foreground w-10">No</th>
                <th className="px-2 py-2.5 text-center font-bold text-foreground min-w-[180px]">항목</th>
                <th className="px-2 py-2.5 text-center font-bold text-foreground min-w-[220px]">상세내용</th>
                <th className="px-2 py-2.5 text-center font-bold text-foreground min-w-[110px]">작업자</th>
                <th className="px-2 py-2.5 text-center font-bold text-foreground w-32">공급가액</th>
                <th className="px-2 py-2.5 text-center font-bold text-foreground w-28">할인금액</th>
                <th className="px-2 py-2.5 text-center font-bold text-foreground w-24">작가수수료(%)</th>
                <th className="px-2 py-2.5 text-center font-bold text-foreground w-32">귀속금액</th>
                <th className="px-2 py-2.5 text-center font-bold text-foreground w-32">액션</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {items.map((it) => {
                const isChild = !!it.group_key;
                const hasChildren = it.id != null && parentIdsWithChildren.has(it.id);
                const isDiscount = it.item_type === 'discount';
                const selectedPrice = priceItems.find((p) => p.id === it.price_item_id);
                return (
                  <tr
                    key={it.id}
                    className={`hover:bg-primary/5 ${isChild ? 'bg-muted/40' : ''} ${isDiscount ? 'bg-red-500/5' : ''}`}
                  >
                    <td className="px-2 py-2 text-center text-muted-foreground tabular-nums">
                      {isChild ? <span className="text-primary">└</span> : it.no}
                    </td>
                    <td className="px-2 py-2">
                      {isDiscount ? (
                        <span className="block text-center text-red-400 text-xs font-medium">할인 행</span>
                      ) : isChild ? (
                        <span className="block text-center text-muted-foreground italic text-[11px]">내부 분리 행</span>
                      ) : (
                        <div className="flex items-center gap-1">
                          <div className="flex-1">
                            <PriceItemSelect
                              priceItems={priceItems}
                              selectedId={it.price_item_id}
                              onSelect={(p) => handlePriceSelect(it.id!, p)}
                            />
                          </div>
                          {selectedPrice?.is_formula && (
                            <span
                              className="text-amber-400 cursor-help flex-shrink-0"
                              title={`수식형 항목: ${selectedPrice.formula_note ?? '직접 입력'}`}
                            >
                              ⓘ
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-2 py-2">
                      <input
                        type="text"
                        value={it.description}
                        onChange={(e) => updateItem(it.id!, { description: e.target.value })}
                        placeholder="상세내용"
                        className="w-full px-2 py-1.5 text-center bg-background border border-border rounded outline-none focus:border-primary text-foreground"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <WriterSelect
                        writers={writers}
                        value={it.writer_names}
                        onChange={(name) => updateItem(it.id!, { writer_names: name })}
                        onPickWriter={(w) => updateItem(it.id!, { writer_names: w.name, writer_pay_rate: w.fee_rate })}
                      />
                    </td>
                    <td className="px-2 py-2">
                      <div className="relative">
                        <NumericInput
                          value={it.supply_amount}
                          onChange={(v) => handleSupplyChange(it.id!, v)}
                          className="w-full px-2 py-1.5 text-center bg-background border border-border rounded outline-none focus:border-primary text-foreground tabular-nums"
                        />
                        {it.is_negotiated && (
                          <span
                            className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-400"
                            title="협의가 (기존 단가와 다름)"
                          />
                        )}
                      </div>
                    </td>
                    <td className="px-2 py-2">
                      <NumericInput
                        value={it.discount_amount}
                        onChange={(v) => updateItem(it.id!, { discount_amount: v })}
                        placeholder="0"
                        className="w-full px-2 py-1.5 text-center bg-background border border-border rounded outline-none focus:border-primary text-foreground tabular-nums"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <PercentCell
                        value={it.writer_pay_rate}
                        onChange={(v) => updateItem(it.id!, { writer_pay_rate: v })}
                        disabled={hasChildren}
                      />
                    </td>
                    <td className="px-2 py-2 text-center text-muted-foreground tabular-nums whitespace-nowrap">
                      {hasChildren ? '—' : formatWon(calcItemBreakdown(it).attribution)}
                    </td>
                    <td className="px-2 py-2">
                      <div className="flex items-center justify-center gap-0.5">
                        <button type="button" onClick={() => moveRow(it.id!, -1)} title="위로" className="p-1 text-muted-foreground hover:text-foreground transition">▲</button>
                        <button type="button" onClick={() => moveRow(it.id!, 1)} title="아래로" className="p-1 text-muted-foreground hover:text-foreground transition">▼</button>
                        <button type="button" onClick={() => duplicateRow(it.id!)} title="복제" className="p-1 text-muted-foreground hover:text-foreground transition">⧉</button>
                        {!isChild && !isDiscount && (
                          <button type="button" onClick={() => addSplitRow(it.id!)} title="내부 행 분리 (외부 1행 ↔ 내부 N행)" className="p-1 text-muted-foreground hover:text-primary transition">⑂</button>
                        )}
                        <button type="button" onClick={() => removeRow(it.id!)} title="삭제" className="p-1 text-red-400 hover:text-red-300 transition">✕</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 합계 영역 */}
      <div className="bg-card border border-border rounded-lg p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <div className="text-xs text-muted-foreground mb-1">총 공급가액 (A)</div>
            <div className="font-bold text-foreground tabular-nums">{formatWon(totals.supplyTotal)}</div>
            <div className="text-[11px] text-muted-foreground tabular-nums">세액 {formatWon(totals.taxA)}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-1">총 작가지급액 (B)</div>
            <div className="font-bold text-foreground tabular-nums">{formatWon(totals.writerPayTotal)}</div>
            <div className="text-[11px] text-muted-foreground tabular-nums">세액 {formatWon(totals.taxB)}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-1">총 귀속금액 (C = A − B)</div>
            <div className="font-bold text-foreground tabular-nums">{formatWon(totals.attributionTotal)}</div>
            <div className="text-[11px] text-muted-foreground tabular-nums">세액 {formatWon(totals.taxC)}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-1">총 합계 (A + 세액)</div>
            <div className="font-bold text-primary text-lg tabular-nums">{formatWon(totals.grandTotal)}</div>
          </div>
        </div>

        {/* 검증 경고 */}
        {totals.warnings.length > 0 && (
          <div className="mt-4 bg-amber-500/10 border border-amber-500/40 rounded-lg p-3 space-y-1">
            {totals.warnings.map((w, i) => (
              <p key={i} className="text-xs text-amber-400">⚠️ {w}</p>
            ))}
          </div>
        )}
      </div>

      {/* 메모 + 저장 */}
      <div className="bg-card border border-border rounded-lg p-6 space-y-4">
        <div>
          <label className="block text-xs font-semibold text-muted-foreground mb-1.5">내부 메모</label>
          <textarea
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg outline-none focus:border-primary text-foreground resize-none"
          />
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/40 rounded-lg p-3">
            <p className="text-xs text-red-400">❌ {error}</p>
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 text-sm border border-border rounded-lg text-foreground hover:bg-muted transition"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition disabled:opacity-50"
          >
            {saving ? '저장 중...' : isEdit ? '수정 저장' : '청구서 생성'}
          </button>
        </div>
      </div>
    </div>
  );
}
