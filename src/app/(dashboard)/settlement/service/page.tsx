'use client';

// 용역 정산 — 일회성 인라인 정산서
// '정산하기' → 인라인 폼(작가·기간 선택) → 정산서 계산(비영속) → 같은 페이지에 정산서 표시.
// '완료'·'뒤로' 시 내용은 사라진다(목록 누적 없음 — PDF/엑셀로만 보관).

import { useEffect, useState, useCallback, useMemo } from 'react';
import { Plus, Briefcase, FileSpreadsheet, Printer, ArrowLeft, Check } from 'lucide-react';
import { WriterSelect } from '@/components/invoice/WriterSelect';
import { DatePicker } from '@/components/ui/DatePicker';
import { SettlementPreview } from '@/components/settlement/SettlementPreview';
import { exportSettlementExcel } from '@/lib/settlement/settlementExcel';
import { getInternalItems } from '@/lib/invoice/calculator';
import { formatWon } from '@/lib/settlement/calculator';
import type { Invoice, Writer, ServiceSettlement } from '@/types/invoice';

type Mode = 'idle' | 'form' | 'preview';

export default function ServiceSettlementPage() {
  const [mode, setMode] = useState<Mode>('idle');
  const [writerOptions, setWriterOptions] = useState<Writer[]>([]);
  const [writerName, setWriterName] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [settlement, setSettlement] = useState<ServiceSettlement | null>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 오늘(로컬) — 날짜 선택 상한. 미래 날짜는 선택 불가.
  const today = useMemo(() => {
    const d = new Date();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${m}-${day}`;
  }, []);

  // 작가 후보 = 작가 마스터 ∪ 청구서 내부 항목 작업자명
  const fetchWriterOptions = useCallback(async () => {
    const [writersRes, invoicesRes] = await Promise.all([
      fetch('/api/writers'),
      fetch('/api/invoices'),
    ]);
    const writers: Writer[] = writersRes.ok ? (await writersRes.json()).writers || [] : [];
    const invoices: Invoice[] = invoicesRes.ok ? (await invoicesRes.json()).invoices || [] : [];

    const masterNames = new Set(writers.map((w) => w.name));
    const extraNames = new Set<string>();
    invoices.forEach((inv) => {
      getInternalItems(inv.items ?? []).forEach((it) => {
        it.writer_names.split(',').map((n) => n.trim()).filter(Boolean).forEach((n) => {
          if (!masterNames.has(n)) extraNames.add(n);
        });
      });
    });

    const extras: Writer[] = Array.from(extraNames).map((n) => ({
      id: `worker-${n}`,
      writer_code: '', // 마스터 미등록 작업자(드롭다운 옵션 전용) — 코드 없음
      name: n,
      writer_type: '일반작가',
      fee_rate: 0,
      permanent_rate: null,
      general_rate: null,
      recontract_date: null,
      english_name: null,
      stage_name: null,
      stage_name_en: null,
      position: [],
      original_writer_code: null,
      status: 'active',
      created_at: '',
    }));
    setWriterOptions([...writers, ...extras]);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async fetch라 setState는 마이크로태스크에서 실행
    fetchWriterOptions();
  }, [fetchWriterOptions]);

  // 입력 초기화 + idle 복귀
  const reset = useCallback(() => {
    setMode('idle');
    setWriterName('');
    setStart('');
    setEnd('');
    setSettlement(null);
    setError(null);
  }, []);

  // 정산 계산 실행(비영속) → 정산서 표시
  const handleRun = async () => {
    if (!writerName.trim()) { setError('작가를 선택하거나 입력하세요.'); return; }
    if (!start || !end) { setError('정산 기간(시작일·종료일)을 선택하세요.'); return; }
    if (start > end) { setError('시작일이 종료일보다 늦습니다.'); return; }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/settlements/service', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          writer_name: writerName.trim(),
          period_start: start,
          period_end: end,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || '정산에 실패했습니다.');
        return;
      }
      setSettlement(data.settlement as ServiceSettlement);
      setMode('preview');
    } catch {
      setError('정산 요청 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => window.print();

  const handleExcel = async () => {
    if (!settlement) return;
    setExporting(true);
    try {
      await exportSettlementExcel(settlement);
    } finally {
      setExporting(false);
    }
  };

  // 날짜 선택 트리거 버튼 스타일 — '연. 월. 일.' 텍스트 폭에 맞춘 고정 폭
  // (텍스트만 가운데 정렬은 centerText, 아이콘은 우측 고정)
  const datePickerClass =
    'w-36 flex items-center justify-between gap-1.5 px-2.5 py-2 text-sm bg-background border border-border rounded-lg hover:border-primary transition cursor-pointer text-foreground';

  // ── 정산서 미리보기 화면 ──
  if (mode === 'preview' && settlement) {
    return (
      <div className="space-y-6">
        <div className="print:hidden flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground mb-1">{settlement.writer_name} · 용역 정산서</h1>
            <p className="text-muted-foreground text-sm">
              {settlement.period_start} ~ {settlement.period_end} · {formatWon(settlement.total_amount)} · {settlement.detail?.length ?? 0}건
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={reset}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs border border-border rounded-lg text-foreground hover:bg-muted transition cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> 뒤로
            </button>
            <button
              onClick={handleExcel}
              disabled={exporting}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs border border-border rounded-lg text-foreground hover:bg-muted transition cursor-pointer disabled:opacity-50"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" /> {exporting ? '생성 중...' : '엑셀 다운로드'}
            </button>
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" /> PDF 저장 / 인쇄
            </button>
            <button
              onClick={reset}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs bg-emerald-500/20 text-emerald-400 rounded-lg hover:bg-emerald-500/30 transition font-medium cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" /> 완료
            </button>
          </div>
        </div>

        <SettlementPreview settlement={settlement} />
      </div>
    );
  }

  // ── idle / form 화면 ──
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <Briefcase className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-2xl font-bold">용역 정산</h1>
            <p className="text-sm text-muted-foreground">입금 완료된 용역을 작가·기간별로 정산합니다.</p>
          </div>
        </div>
        {mode === 'idle' && (
          <button
            onClick={() => setMode('form')}
            className="inline-flex items-center bg-blue-600 text-white px-4 py-2 rounded-lg hover:opacity-90 transition font-medium cursor-pointer"
          >
            <Plus className="w-4 h-4 mr-2" />정산하기
          </button>
        )}
      </div>

      {mode === 'idle' ? (
        <div className="bg-card border border-border rounded-lg p-10 text-center">
          <p className="text-muted-foreground">
            (+ 정산하기)로 작가·기간을 선택하면 용역 정산서가 바로 생성됩니다.
          </p>
        </div>
      ) : (
        // 인라인 정산 입력 패널 — 작가마스터 등록행과 동일 톤(테마 통일), 콘텐츠 폭으로 가운데 정렬
        <section className="bg-card border border-primary/40 rounded-lg p-4 w-fit max-w-full mx-auto">
          {loading ? (
            <div className="py-8 flex flex-col items-center justify-center text-center">
              <div className="animate-spin rounded-full h-9 w-9 border-[3px] border-border border-t-primary mb-3" />
              <p className="text-sm font-semibold text-foreground animate-pulse">정산 진행 중...</p>
              <p className="text-xs text-muted-foreground mt-1">입금 완료 내역을 집계하고 있습니다.</p>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-end justify-center gap-3">
                {/* 작가명 */}
                <div className="w-48">
                  <label className="block text-xs text-muted-foreground mb-1 text-center">작가명</label>
                  <WriterSelect
                    writers={writerOptions}
                    value={writerName}
                    onChange={setWriterName}
                    onPickWriter={(w) => setWriterName(w.name)}
                    placeholder="작가 선택 / 입력"
                  />
                </div>

                {/* 정산 시작일 */}
                <div>
                  <label className="block text-xs text-muted-foreground mb-1 text-center">정산 시작일</label>
                  <DatePicker value={start} onChange={setStart} maxDate={today} placeholder="시작일" centerText className={datePickerClass} />
                </div>

                {/* 정산 종료일 */}
                <div>
                  <label className="block text-xs text-muted-foreground mb-1 text-center">정산 종료일</label>
                  <DatePicker value={end} onChange={setEnd} maxDate={today} placeholder="종료일" centerText className={datePickerClass} />
                </div>

                {/* 액션 — 정산하기 먼저, 취소 나중 */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleRun}
                    className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition font-medium cursor-pointer"
                  >
                    정산하기
                  </button>
                  <button
                    onClick={reset}
                    className="px-4 py-2 text-sm border border-border rounded-lg text-foreground hover:bg-muted transition cursor-pointer"
                  >
                    취소
                  </button>
                </div>
              </div>

              {error && (
                <p className="mt-3 text-xs text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}
            </>
          )}
        </section>
      )}
    </div>
  );
}
