'use client';

// 용역 정산 — 목록 + 상태 방식
// 입금 완료(status='paid')된 청구서에서 (작가 × 거래) 행이 자동 표출된다.
// 탭(전체/미정산/정산완료) + 필터(구분·작가명·기간) + 목록표. 작가 셀 클릭 시 항목 내역 모달.
// 정산서(PDF/엑셀) 출력 버튼은 추후 별도 설계 예정 — 양식 파일(SettlementPreview/settlementExcel)은 보존.

import { useEffect, useState, useCallback, useMemo } from 'react';
import { Eye } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { DatePicker } from '@/components/ui/DatePicker';
import { SelectMenu } from '@/components/ui/SelectMenu';
import {
  SettlementStatusSelect,
  type SettlementStatus,
} from '@/components/settlement/SettlementStatusSelect';
import { SettlementDetailModal } from '@/components/settlement/SettlementDetailModal';
import { formatWon } from '@/lib/settlement/calculator';
import { settlementKey, type SettlementRow } from '@/lib/settlement/serviceRows';
import type { Writer } from '@/types/invoice';

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

  // 날짜 선택 트리거 버튼 스타일 — 기존 용역정산 페이지와 동일
  const datePickerClass =
    'w-36 flex items-center justify-between gap-1.5 px-2.5 py-2 text-sm bg-background border border-border rounded-lg hover:border-primary transition cursor-pointer text-foreground';

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
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase text-muted-foreground">
                <th className="px-4 py-3 text-center font-medium">작가</th>
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
                  <td className="px-4 py-3 text-center text-foreground font-medium">{r.writer_name}</td>
                  <td className="px-4 py-3 text-center text-foreground">{r.title}</td>
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
        <SettlementDetailModal row={detailRow} onClose={() => setDetailRow(null)} />
      )}
    </div>
  );
}
