'use client';

// 청구서 미리보기 + 출력 (거래처 청구서 / 내부 지급서 탭)

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import type { Invoice, InvoiceStatus } from '@/types/invoice';
import { InvoicePreview } from '@/components/invoice/InvoicePreview';
import { exportInvoiceExcel } from '@/lib/invoice/excelExport';

type PreviewTab = 'external' | 'internal';

const STATUS_OPTIONS: { value: InvoiceStatus; label: string }[] = [
  { value: 'draft', label: '작성 중' },
  { value: 'confirmed', label: '확정' },
  { value: 'sent', label: '발송됨' },
  { value: 'paid', label: '입금완료' },
];

export default function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<PreviewTab>(tabParam === 'internal' ? 'internal' : 'external');
  const [showNegotiatedNote, setShowNegotiatedNote] = useState(true);

  // URL ?tab= 쿼리와 탭 동기화 — 프리렌더/늦은 도착으로 초기값을 놓쳐도 보정.
  // 사용자의 수동 탭 클릭은 URL을 바꾸지 않으므로 보존됨.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- URL 쿼리와 탭 동기화
    if (tabParam === 'internal' || tabParam === 'external') setTab(tabParam);
  }, [tabParam]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/invoices/${id}`);
        if (!res.ok) throw new Error((await res.json()).error || '조회 실패');
        setInvoice((await res.json()).invoice);
      } catch (err) {
        setError(err instanceof Error ? err.message : '오류가 발생했습니다.');
      } finally {
        setIsLoading(false);
      }
    })();
  }, [id]);

  const handleStatusChange = async (status: InvoiceStatus) => {
    if (!invoice) return;
    const res = await fetch(`/api/invoices/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (res.ok) setInvoice({ ...invoice, status });
  };

  // PDF 저장/인쇄 — 활성 탭만 인쇄 (print CSS)
  const handlePrint = () => window.print();

  if (isLoading) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin rounded-full h-6 w-6 border-2 border-border border-t-primary mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">청구서 로딩 중...</p>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-400 mb-4">오류: {error ?? '청구서를 찾을 수 없습니다.'}</p>
        <Link href="/invoices" className="text-primary text-sm hover:underline">← 목록으로</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 상단 헤더 (인쇄 미포함) */}
      <div className="print:hidden flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground mb-1">{invoice.title}</h1>
          <p className="text-muted-foreground text-sm">
            {invoice.client?.name ?? '거래처 미지정'} · {invoice.invoice_date}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={invoice.status}
            onChange={(e) => handleStatusChange(e.target.value as InvoiceStatus)}
            className="px-3 py-2 text-xs bg-background border border-border rounded-lg outline-none focus:border-primary text-foreground"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
          <Link
            href={`/invoices/${id}/edit`}
            className="px-3 py-2 text-xs border border-border rounded-lg text-foreground hover:bg-muted transition"
          >
            ✏️ 수정
          </Link>
          <button
            onClick={() => exportInvoiceExcel(invoice)}
            className="px-3 py-2 text-xs border border-border rounded-lg text-foreground hover:bg-muted transition"
          >
            📊 엑셀 다운로드
          </button>
          <button
            onClick={handlePrint}
            className="px-3 py-2 text-xs bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition"
          >
            🖨️ PDF 저장 / 인쇄
          </button>
        </div>
      </div>

      {/* 탭 (인쇄 미포함) */}
      <div className="print:hidden flex items-center justify-between border-b border-border">
        <div className="flex gap-2">
          {([
            { key: 'external', label: '🧾 거래처 청구서 (외부용)' },
            { key: 'internal', label: '💸 내부 지급서 (내부용)' },
          ] as { key: PreviewTab; label: string }[]).map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition cursor-pointer whitespace-nowrap ${
                tab === t.key
                  ? 'border-b-primary text-primary'
                  : 'border-b-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer pb-1">
          <input
            type="checkbox"
            checked={showNegotiatedNote}
            onChange={(e) => setShowNegotiatedNote(e.target.checked)}
            className="accent-[var(--primary)]"
          />
          협의가 주석 표시
        </label>
      </div>

      {/* 미리보기 */}
      <InvoicePreview invoice={invoice} mode={tab} showNegotiatedNote={showNegotiatedNote} />

      {/* 메모 (인쇄 미포함) */}
      {invoice.memo && (
        <div className="print:hidden bg-card border border-border rounded-lg p-4">
          <p className="text-xs font-semibold text-muted-foreground mb-1">내부 메모</p>
          <p className="text-sm text-foreground whitespace-pre-wrap">{invoice.memo}</p>
        </div>
      )}
    </div>
  );
}
