'use client';

// 용역 정산 — 목록 + 상태 방식
// 입금 완료(status='paid')된 청구서에서 (작가 × 거래) 행이 자동 표출된다.
// 탭(전체/미정산/정산완료) + 필터(구분·작가명·기간) + 목록표. 작가 셀 클릭 시 항목 내역 모달.
// 정산서(PDF/엑셀) 출력 버튼은 추후 별도 설계 예정 — 양식 파일(SettlementPreview/settlementExcel)은 보존.

import { useEffect, useState, useCallback, useMemo } from 'react';
import { Eye, FileSpreadsheet, Printer, ArrowLeft, ReceiptText, Check } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { DatePicker } from '@/components/ui/DatePicker';
import { SelectMenu } from '@/components/ui/SelectMenu';
import {
  SettlementStatusSelect,
  type SettlementStatus,
} from '@/components/settlement/SettlementStatusSelect';
import { SettlementDetailModal } from '@/components/settlement/SettlementDetailModal';
import { SettlementPreview } from '@/components/settlement/SettlementPreview';
import { exportSettlementExcel } from '@/lib/settlement/settlementExcel';
import { formatWon } from '@/lib/settlement/calculator';
import {
  settlementKey,
  buildSettlementFromRows,
  type SettlementRow,
} from '@/lib/settlement/serviceRows';
import type { Writer, ServiceSettlement } from '@/types/invoice';

type StatusTab = '전체' | SettlementStatus;
type Kind = '전체' | '전속작가' | '일반작가';

const STATUS_TABS: { value: StatusTab; label: string }[] = [
  { value: '전체', label: '전체' },
  { value: 'unsettled', label: '미정산' },
  { value: 'settled', label: '정산완료' },
];

export default function ServiceSettlementPage() {
  const [rows, setRows] = useState<SettlementRow[]>([]);
  const [writers, setWriters] = useState<Writer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 필터 상태
  const [statusTab, setStatusTab] = useState<StatusTab>('전체');
  const [kind, setKind] = useState<Kind>('전체');
  const [writerName, setWriterName] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');

  // 상세 모달 대상
  const [detailRow, setDetailRow] = useState<SettlementRow | null>(null);

  // 정산서 미리보기 (일괄/개인별 공용)
  const [preview, setPreview] = useState<ServiceSettlement | null>(null);
  const [previewRows, setPreviewRows] = useState<SettlementRow[]>([]); // 미리보기에 포함된 출처 행(완료 처리용)
  const [previewDoc, setPreviewDoc] = useState(''); // 미리보기 문서번호 표기
  const [exporting, setExporting] = useState(false);
  const [completing, setCompleting] = useState(false);

  // 오늘(로컬) — 날짜 선택 상한
  const today = useMemo(() => {
    const d = new Date();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${m}-${day}`;
  }, []);

  // 데이터 로드 — 목록 행 + 작가 마스터(구분 분류용). async IIFE라 setState는 await 이후 실행.
  useEffect(() => {
    (async () => {
      try {
        const [rowsRes, writersRes] = await Promise.all([
          fetch('/api/settlements/service'),
          fetch('/api/writers'),
        ]);
        const rowsJson = rowsRes.ok ? await rowsRes.json() : { rows: [] };
        const writersJson = writersRes.ok ? await writersRes.json() : { writers: [] };
        setRows(rowsJson.rows ?? []);
        setWriters(writersJson.writers ?? []);
      } catch {
        setError('목록을 불러오지 못했습니다.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // 작가명 → 구분(writer_type). 마스터 미등록 작업자는 '일반작가'로 취급.
  const typeOf = useCallback(
    (name: string): Kind => {
      const w = writers.find((x) => x.name === name);
      return w?.writer_type === '전속작가' ? '전속작가' : '일반작가';
    },
    [writers],
  );

  // 구분에 종속된 작가명 옵션 — 목록에 실제 데이터가 있는 작가만, 구분으로 필터
  const writerOptions = useMemo(() => {
    const names = new Set<string>();
    for (const r of rows) {
      if (kind === '전체' || typeOf(r.writer_name) === kind) names.add(r.writer_name);
    }
    return Array.from(names).sort((a, b) => a.localeCompare(b, 'ko'));
  }, [rows, kind, typeOf]);

  // 필터 적용된 행
  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (statusTab !== '전체' && r.status !== statusTab) return false;
      if (kind !== '전체' && typeOf(r.writer_name) !== kind) return false;
      if (writerName && r.writer_name !== writerName) return false;
      const d = r.paid_at?.slice(0, 10) ?? '';
      if (start && d < start) return false;
      if (end && d > end) return false;
      return true;
    });
  }, [rows, statusTab, kind, writerName, start, end, typeOf]);

  // 탭별 건수
  const tabCount = (tab: StatusTab) =>
    tab === '전체' ? rows.length : rows.filter((r) => r.status === tab).length;

  // 상태 토글 — 낙관적 업데이트 후 서버 반영, 실패 시 롤백
  const handleStatus = async (row: SettlementRow, next: SettlementStatus) => {
    const key = settlementKey(row.invoice_id, row.writer_name);
    const prev = row.status;
    setRows((list) =>
      list.map((r) =>
        settlementKey(r.invoice_id, r.writer_name) === key ? { ...r, status: next } : r,
      ),
    );
    try {
      const res = await fetch('/api/settlements/service/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoice_id: row.invoice_id,
          writer_name: row.writer_name,
          settled: next === 'settled',
        }),
      });
      if (!res.ok) throw new Error();
    } catch {
      // 롤백
      setRows((list) =>
        list.map((r) =>
          settlementKey(r.invoice_id, r.writer_name) === key ? { ...r, status: prev } : r,
        ),
      );
      setError('상태 변경에 실패했습니다.');
    }
  };

  // 정산 기간 산출 — 필터 날짜 우선, 없으면 대상 행들의 입금완료일 min/max
  const periodOf = useCallback(
    (targetRows: SettlementRow[]): { start: string; end: string } => {
      const dates = targetRows
        .map((r) => r.paid_at?.slice(0, 10))
        .filter((d): d is string => !!d)
        .sort();
      return {
        start: start || dates[0] || today,
        end: end || dates[dates.length - 1] || today,
      };
    },
    [start, end, today],
  );

  // 미리보기 문서번호 — 단일이면 그 번호, 복수면 '대표 외 N건'
  const docNumberOf = (targetRows: SettlementRow[]): string => {
    const nums = Array.from(new Set(targetRows.map((r) => r.doc_number).filter(Boolean)));
    if (nums.length === 0) return '';
    if (nums.length === 1) return nums[0];
    return `${nums[0]} 외 ${nums.length - 1}건`;
  };

  // 미리보기 진입 공통 — 출처 행·문서번호 보관 후 정산서 생성
  const openPreview = (targetRows: SettlementRow[], writer: string) => {
    const { start: ps, end: pe } = periodOf(targetRows);
    setPreviewRows(targetRows);
    setPreviewDoc(docNumberOf(targetRows));
    setPreview(buildSettlementFromRows(targetRows, writer, ps, pe, new Date().toISOString()));
  };

  // 일괄 정산 — 현재 필터(선택 작가)에 해당하는 행들로 정산서 미리보기
  const handleBulk = () => {
    if (!writerName) {
      setError('일괄 정산은 작가를 선택해야 합니다.');
      return;
    }
    if (filtered.length === 0) {
      setError('정산할 내역이 없습니다.');
      return;
    }
    setError(null);
    openPreview(filtered, writerName);
  };

  // 개인별 정산서 — 상세 모달의 '정산서 생성'에서 한 행만으로 미리보기
  const handleGenerate = (row: SettlementRow) => {
    setDetailRow(null);
    openPreview([row], row.writer_name);
  };

  const handlePrint = () => window.print();

  const handleExcel = async () => {
    if (!preview) return;
    setExporting(true);
    try {
      await exportSettlementExcel(preview);
    } finally {
      setExporting(false);
    }
  };

  // 완료 — 미리보기에 포함된 행들을 정산완료로 영속하고 목록에 반영, 목록으로 복귀
  const handleComplete = async () => {
    if (previewRows.length === 0) return;
    setCompleting(true);
    try {
      const results = await Promise.all(
        previewRows.map((r) =>
          fetch('/api/settlements/service/status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              invoice_id: r.invoice_id,
              writer_name: r.writer_name,
              settled: true,
            }),
          }).then((res) => res.ok),
        ),
      );
      const okKeys = new Set(
        previewRows
          .filter((_, i) => results[i])
          .map((r) => settlementKey(r.invoice_id, r.writer_name)),
      );
      setRows((list) =>
        list.map((r) =>
          okKeys.has(settlementKey(r.invoice_id, r.writer_name))
            ? { ...r, status: 'settled' as const }
            : r,
        ),
      );
      if (okKeys.size < previewRows.length) setError('일부 항목의 정산완료 처리에 실패했습니다.');
      setPreview(null);
    } finally {
      setCompleting(false);
    }
  };

  // 날짜 선택 트리거 버튼 스타일 — 기존 용역정산 페이지와 동일
  const datePickerClass =
    'w-36 flex items-center justify-between gap-1.5 px-2.5 py-2 text-sm bg-background border border-border rounded-lg hover:border-primary transition cursor-pointer text-foreground';

  // ── 정산서 미리보기 화면 ──
  if (preview) {
    return (
      <div className="space-y-6">
        <PageHeader
          className="print:hidden"
          titleClassName="text-2xl"
          divider={false}
          title={`${preview.writer_name} · 용역 정산서`}
          description={`${preview.period_start} ~ ${preview.period_end} · ${formatWon(preview.total_amount)} · ${preview.detail?.length ?? 0}건`}
          actions={
            <>
              <button
                onClick={() => setPreview(null)}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs border border-border rounded-lg text-foreground hover:bg-muted transition cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> 목록
              </button>
              <button
                onClick={handleComplete}
                disabled={completing}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs bg-emerald-500/20 text-emerald-400 rounded-lg hover:bg-emerald-500/30 transition font-medium cursor-pointer disabled:opacity-50"
              >
                <Check className="w-3.5 h-3.5" /> {completing ? '처리 중...' : '완료'}
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
            </>
          }
        />
        <SettlementPreview settlement={preview} docNumber={previewDoc} />
      </div>
    );
  }

  return (
    <div>
      {/* 탭이 구분선 역할을 하므로 헤더 구분선은 제거(divider={false}) — 이중 구분선 방지 */}
      <PageHeader
        title="용역 정산"
        description="입금 완료된 용역의 작가별 지급 내역과 정산 상태를 관리합니다."
        titleClassName="text-2xl"
        className="mb-6"
        divider={false}
      />

      {/* 탭 — 전체/미정산/정산완료 (거래처 청구서와 동일한 밑줄 탭 형식) */}
      <div className="flex gap-2 border-b border-border overflow-x-auto mb-3">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setStatusTab(tab.value)}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition cursor-pointer whitespace-nowrap ${
              statusTab === tab.value
                ? 'border-b-primary text-primary'
                : 'border-b-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label} ({tabCount(tab.value)})
          </button>
        ))}
      </div>

      {/* 필터바 — 구분 → 작가명 → 기간 (카드 블럭 없이, 커스텀 선택창) */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <SelectMenu
          value={kind}
          onChange={(v) => { setKind(v as Kind); setWriterName(''); }}
          options={[
            { value: '전체', label: '전체 구분' },
            { value: '전속작가', label: '전속작가' },
            { value: '일반작가', label: '일반작가' },
          ]}
          className="w-36"
          title="구분"
        />

        <SelectMenu
          value={writerName}
          onChange={setWriterName}
          options={[
            { value: '', label: '모든 작가' },
            ...writerOptions.map((name) => ({ value: name, label: name })),
          ]}
          className="w-40"
          title="작가명"
        />

        <div className="flex items-center gap-1.5">
          <DatePicker
            value={start}
            onChange={setStart}
            maxDate={end || today}
            placeholder="시작일"
            centerText
            className={datePickerClass}
          />
          <span className="text-muted-foreground text-sm">~</span>
          <DatePicker
            value={end}
            onChange={setEnd}
            maxDate={today}
            placeholder="종료일"
            centerText
            className={datePickerClass}
          />
        </div>

        {/* 일괄 정산 — 선택 작가의 필터 내역으로 정산서 미리보기 (작가 선택 필수) */}
        <button
          onClick={handleBulk}
          disabled={!writerName}
          title={writerName ? '선택 작가의 정산서 미리보기' : '작가를 선택하면 일괄 정산이 가능합니다'}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition cursor-pointer font-medium disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ReceiptText className="w-4 h-4" /> 일괄 정산
        </button>
      </div>

      {error && (
        <p className="mb-3 text-xs text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      {/* 목록표 */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        {loading ? (
          <div className="py-12 text-center">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-border border-t-primary mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">불러오는 중...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground text-sm">
            조건에 맞는 정산 내역이 없습니다.
          </div>
        ) : (
          // table-fixed + colgroup 고정폭 — 데이터(작가/거래명 길이)와 무관하게 컬럼 폭 고정(흔들림 방지)
          <table className="w-full text-sm table-fixed">
            {/* table-fixed + 내용량 비례 % 폭(합 100%) — 여백을 고르게 분배해 균형 있게(데이터 무관 안정) */}
            <colgroup>
              <col className="w-[11%]" />
              <col className="w-[9%]" />
              <col className="w-[17%]" />
              <col className="w-[19%]" />
              <col className="w-[13%]" />
              <col className="w-[12%]" />
              <col className="w-[10%]" />
              <col className="w-[9%]" />
            </colgroup>
            <thead>
              <tr className="border-b border-border text-xs uppercase text-muted-foreground">
                <th className="px-4 py-3 text-center font-medium">문서번호</th>
                <th className="px-4 py-3 text-center font-medium">작가명</th>
                <th className="px-4 py-3 text-center font-medium">거래처</th>
                <th className="px-4 py-3 text-center font-medium">거래명</th>
                <th className="px-4 py-3 text-center font-medium">지급액</th>
                <th className="px-4 py-3 text-center font-medium">입금완료일</th>
                <th className="px-4 py-3 text-center font-medium">정산 상세</th>
                <th className="px-4 py-3 text-center font-medium">상태</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr
                  key={settlementKey(r.invoice_id, r.writer_name)}
                  className="border-b border-border last:border-0"
                >
                  <td className="px-4 py-3 text-center text-muted-foreground tabular-nums whitespace-nowrap">{r.doc_number || '-'}</td>
                  <td className="px-4 py-3 text-center text-foreground font-medium truncate">{r.writer_name}</td>
                  <td className="px-4 py-3 text-center text-foreground truncate">{r.client_name || '-'}</td>
                  <td className="px-4 py-3 text-center text-foreground truncate" title={r.title}>{r.title}</td>
                  <td className="px-4 py-3 text-center text-foreground tabular-nums whitespace-nowrap">
                    {formatWon(r.writer_pay)}
                  </td>
                  <td className="px-4 py-3 text-center text-muted-foreground tabular-nums whitespace-nowrap">
                    {r.paid_at?.slice(0, 10) ?? '-'}
                  </td>
                  {/* 정산 상세 — 상세보기 버튼으로 항목 내역 모달 */}
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => setDetailRow(r)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs border border-border rounded-lg text-foreground hover:bg-muted hover:border-primary transition cursor-pointer whitespace-nowrap"
                      title="정산 상세내역 보기"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      상세보기
                    </button>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <SettlementStatusSelect
                      value={r.status}
                      onChange={(next) => handleStatus(r, next)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {detailRow && (
        <SettlementDetailModal
          row={detailRow}
          onClose={() => setDetailRow(null)}
          onGenerate={() => handleGenerate(detailRow)}
        />
      )}
    </div>
  );
}
