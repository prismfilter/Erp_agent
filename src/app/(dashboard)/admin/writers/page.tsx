'use client';

// 작가 마스터 — 작가명·구분(전속/일반)·용역 요율(%) 관리
// 로그인 계정(user_roles)과 무관한 작가/작업자 레지스트리. 조회: ADMIN+STAFF / 수정: ADMIN only

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useAuthStore } from '@/store/authStore';
import type { Writer, WorkWriterGroup } from '@/types/invoice';
import { useTableSort } from '@/hooks/useTableSort';
import { useRowFocus } from '@/hooks/useRowFocus';
import { nextWriterCode } from '@/lib/writers/writerCode';
import { WriterTable, WriterTypeSelect, WRITER_TYPES, type WriterType } from '@/components/writers/WriterTable';
import { PageHeader } from '@/components/layout/PageHeader';

const TERMINATED_TAB = '계약 해지' as const;
type WriterTab = '전체' | WriterType | typeof TERMINATED_TAB;

export default function WriterMasterPage() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN';

  const [writers, setWriters] = useState<Writer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState<WriterTab>('전체');

  // 등록 폼 — 기본 식별정보만 입력(요율·계약정보는 상세 페이지에서 설정)
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<WriterType>('전속작가');
  const [newStageName, setNewStageName] = useState('');       // 활동명 — 빈값=미지정
  const [newOriginalCode, setNewOriginalCode] = useState(''); // 원작자 코드 — 빈값=미지정
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

  // 등록 폼 초기화 — 추가/취소 공용
  const resetAddForm = () => {
    setNewName(''); setNewType('전속작가');
    setNewStageName(''); setNewOriginalCode(''); setNameMode('select');
  };

  const handleAdd = async () => {
    if (!newName.trim()) { showToast('작가명을 입력하세요'); return; }
    const res = await fetch('/api/writers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: newName.trim(),
        writer_type: newType,
        fee_rate: 0, // 요율은 상세 페이지 '저작물 요율' 섹션에서 설정(등록 시 미설정)
        stage_name: newStageName.trim() || null,
        original_writer_code: newOriginalCode.trim() || null,
      }),
    });
    if (res.ok) {
      setAdding(false);
      resetAddForm();
      fetchWriters();
      showToast('작가 등록 완료');
    } else {
      showToast((await res.json()).error || '등록 실패');
    }
  };

  // 작가 삭제 — 확인 UI는 WriterTable 내부에서 관리, 여기서는 API 호출·상태 업데이트만
  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/writers/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setWriters((prev) => prev.filter((w) => w.id !== id));
      showToast('삭제 완료');
    } else {
      showToast((await res.json()).error || '삭제 실패');
    }
  };

  // 정렬: 표 컬럼(작가코드·작가명·활동명·원작자코드·계약기간·계약상태) 기준
  const { sortKey, dir, toggle, sortRows } = useTableSort<Writer>({
    writer_code: (w) => w.writer_code,
    name: (w) => w.name,
    stage_name: (w) => w.stage_name,
    original_writer_code: (w) => w.original_writer_code,
    contract_start: (w) => w.contract_start,
    status: (w) => w.status,
  }, 'pf_sort_writers');

  // 해지 작가는 일반 탭(전체/전속/일반)에서 제외하고 '계약 해지' 탭으로 이동
  const activeWriters = useMemo(() => writers.filter((w) => w.status !== 'terminated'), [writers]);
  const exclusive = useMemo(() => sortRows(activeWriters.filter((w) => w.writer_type === '전속작가')), [activeWriters, sortRows]);
  const general = useMemo(() => sortRows(activeWriters.filter((w) => w.writer_type === '일반작가')), [activeWriters, sortRows]);
  const terminated = useMemo(() => sortRows(writers.filter((w) => w.status === 'terminated')), [writers, sortRows]);

  const tabCount = (tab: WriterTab) => {
    if (tab === TERMINATED_TAB) return writers.filter((w) => w.status === 'terminated').length;
    const active = writers.filter((w) => w.status !== 'terminated');
    return tab === '전체' ? active.length : active.filter((w) => w.writer_type === tab).length;
  };

  // 검색으로 진입 시 해당 작가 행으로 스크롤 + 하이라이트
  useRowFocus(!isLoading && writers.length > 0);

  // URL ?focus= 파라미터를 읽어 WriterTable에 포커스 행 아이디 전달
  const focusId = useMemo(
    () => (typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('focus') : null),
    []
  );

  // 등록 폼 작가 코드 미리보기 — 구분에 따라 다음 코드를 보여줌(서버가 최종 부여, 읽기전용)
  const previewCode = useMemo(
    () => nextWriterCode(writers.map((w) => w.writer_code).filter(Boolean), newType),
    [writers, newType]
  );

  // 저작물 DB 작가 중 아직 마스터에 미등록인 이름만 — 등록되면 자동으로 선택박스에서 사라짐
  const availableNames = useMemo(() => {
    const registered = new Set(writers.map((w) => w.name.trim()));
    return worksWriters.filter((n) => !registered.has(n.trim()));
  }, [writers, worksWriters]);

  return (
    <div className="space-y-6">
      <PageHeader
        divider={false}
        title="작가 마스터"
        description={
          <>
            작가/작업자 명단 · 구분 · 용역 요율 관리
            {!isAdmin && ' · 수정은 관리자만 가능'}
          </>
        }
        actions={
          isAdmin && (
            <button
              onClick={() => {
                if (!adding) resetAddForm();
                setAdding((v) => !v);
              }}
              className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition font-medium cursor-pointer"
            >
              + 등록
            </button>
          )
        }
      />

      {/* 등록 폼 */}
      {adding && (
        <div className="bg-card border border-primary/40 rounded-lg p-4 flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs text-muted-foreground mb-1 text-center">작가 코드</label>
            <div
              className="w-24 px-3 py-2 text-sm text-center bg-muted/50 border border-border rounded-lg text-muted-foreground font-mono tabular-nums select-none"
              title="구분에 따라 자동 부여 (중복·수정 불가)"
            >
              {previewCode}
            </div>
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1 text-center">구분</label>
            <WriterTypeSelect value={newType} onChange={setNewType} />
          </div>
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
            <label className="block text-xs text-muted-foreground mb-1 text-center">활동명</label>
            <input
              type="text"
              value={newStageName}
              onChange={(e) => setNewStageName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }}
              placeholder="활동명 입력"
              maxLength={30}
              className="w-40 px-3 py-2 text-sm text-center bg-background border border-border rounded-lg outline-none focus:border-primary text-foreground"
            />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1 text-center">원작자 코드</label>
            <input
              type="text"
              value={newOriginalCode}
              onChange={(e) => setNewOriginalCode(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }}
              placeholder="원작자 코드 입력"
              maxLength={30}
              className="w-40 px-3 py-2 text-sm text-center bg-background border border-border rounded-lg outline-none focus:border-primary text-foreground"
            />
          </div>
          <button
            onClick={handleAdd}
            className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition cursor-pointer"
          >
            추가
          </button>
          <button
            onClick={() => { setAdding(false); resetAddForm(); }}
            className="px-4 py-2 text-sm border border-border text-muted-foreground rounded-lg hover:bg-primary/10 hover:text-foreground transition cursor-pointer"
          >
            취소
          </button>
        </div>
      )}

      {/* 탭 (구분선 ↔ 표 사이 간격을 mb-10으로 살짝 넓힘 — 인접 마진 병합으로 이 간격만 증가) */}
      <div className="flex flex-wrap gap-2 border-b border-border mb-10">
        {(['전체', ...WRITER_TYPES, TERMINATED_TAB] as WriterTab[]).map((tab) => (
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

      {/* 로딩·오류 상태 */}
      {isLoading ? (
        <div className="bg-card border border-border rounded-lg overflow-hidden w-full max-w-7xl mx-auto">
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-border border-t-primary mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">데이터 로딩 중...</p>
          </div>
        </div>
      ) : error ? (
        <div className="bg-card border border-border rounded-lg overflow-hidden w-full max-w-7xl mx-auto">
          <div className="p-8 text-center">
            <p className="text-red-400">오류: {error}</p>
          </div>
        </div>
      ) : selectedTab === TERMINATED_TAB ? (
        /* 계약 해지 탭 — 해지 작가만 단일 섹션으로 표시 */
        <WriterTable
          title="계약 해지"
          writers={terminated}
          isAdmin={isAdmin}
          sortKey={sortKey}
          dir={dir}
          toggle={toggle}
          onDelete={handleDelete}
          focusId={focusId}
        />
      ) : (
        /* 전체·전속작가·일반작가 탭 — 구분별 섹션으로 분리 표시 */
        <div className="space-y-8">
          {(selectedTab === '전체' || selectedTab === '전속작가') && (
            <WriterTable
              title="전속작가"
              writers={exclusive}
              isAdmin={isAdmin}
              sortKey={sortKey}
              dir={dir}
              toggle={toggle}
              onDelete={handleDelete}
              focusId={focusId}
            />
          )}
          {(selectedTab === '전체' || selectedTab === '일반작가') && (
            <WriterTable
              title="일반작가"
              writers={general}
              isAdmin={isAdmin}
              sortKey={sortKey}
              dir={dir}
              toggle={toggle}
              onDelete={handleDelete}
              focusId={focusId}
            />
          )}
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-foreground text-background text-sm px-4 py-2 rounded-full shadow-lg z-50 pointer-events-none">
          {toast}
        </div>
      )}
    </div>
  );
}
