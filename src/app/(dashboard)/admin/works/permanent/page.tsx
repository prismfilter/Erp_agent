'use client';

// 영구 저작물 DB — 출판사 관리 저작물(작품 단위, 저작물코드로 유일)
// 좌측 자사작가 목록(sticky) → 우측 해당 작가가 참여한 작품 표. 전체보기는 20개씩 더보기.
// 우클릭 → 상세보기(STAFF↑) / 삭제(ADMIN). 신규 등록은 별도 페이지로 진입.
// 조회: ADMIN/STAFF · 등록/삭제: ADMIN only (API에서 강제)

import Link from 'next/link';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { useAuthStore } from '@/store/authStore';
import type { Work, WorkWriterGroup } from '@/types/invoice';
import { useTableSort } from '@/hooks/useTableSort';
import { useRowFocus } from '@/hooks/useRowFocus';
import { SortableHeader } from '@/components/ui/SortableHeader';
import { WorkDetailModal } from '@/components/works/WorkDetailModal';

const PAGE_SIZE = 20;

// YYYY-MM-DD → YYYY.MM.DD (없으면 '-')
function formatDate(d: string | null): string {
  if (!d) return '-';
  return d.slice(0, 10).replace(/-/g, '.');
}

export default function WorksPage() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN';

  const [writers, setWriters] = useState<WorkWriterGroup[]>([]);
  // null = 전체보기. 검색으로 진입(?writer=)하면 해당 작가를 선택해 그 작가의 작품을 로드한다.
  const [selectedWriter, setSelectedWriter] = useState<string | null>(
    () => (typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('writer') : null)
  );
  const [works, setWorks] = useState<Work[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  // 우클릭 컨텍스트 메뉴 위치/대상(어떤 행인지 헤더로 표시) + 상세보기/삭제 대상
  const [contextMenu, setContextMenu] = useState<{ id: string; no: number; title: string; x: number; y: number } | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  };

  // 좌측 자사작가 목록
  const loadWriters = useCallback(async () => {
    try {
      const res = await fetch('/api/works/writers');
      if (res.ok) setWriters((await res.json()).writers || []);
    } catch {
      // 무시 — 표 영역 에러로 충분
    }
  }, []);

  // 표 로딩 (작가 선택 시 그 작가 작품 전체 / 전체보기 시 첫 페이지)
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

  // 행 삭제 (우클릭 메뉴 → 확인 다이얼로그 → 실행)
  const performDelete = async (id: string) => {
    setConfirmDeleteId(null);
    const res = await fetch(`/api/works/${id}`, { method: 'DELETE' });
    if (res.ok) {
      await loadWriters();
      await loadWorks();
      showToast('삭제 완료');
    } else {
      showToast((await res.json()).error || '삭제 실패');
    }
  };

  // 컨텍스트 메뉴: 외부 클릭·스크롤·Esc 시 닫기
  useEffect(() => {
    if (!contextMenu) return;
    const close = () => setContextMenu(null);
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setContextMenu(null); };
    window.addEventListener('click', close);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('click', close);
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
      window.removeEventListener('keydown', onKey);
    };
  }, [contextMenu]);

  // 정렬 (로드된 행 대상)
  const { sortKey, dir, toggle, sortRows } = useTableSort<Work>({
    no: (w) => w.no,
    komca_code: (w) => w.komca_code,
    song_title: (w) => w.song_title,
    artist: (w) => w.artist,
    publish_date: (w) => w.publish_date,
    iswc: (w) => w.iswc,
  }, 'pf_sort_works');

  const sorted = useMemo(() => sortRows(works), [works, sortRows]);

  // 검색으로 진입 시 해당 저작물 행으로 스크롤 + 하이라이트
  useRowFocus(!isLoading && works.length > 0);
  const allCount = writers.reduce((s, w) => s + w.count, 0);

  // 작가 패널 항목
  const renderWriterButton = (label: string, count: number, key: string | null) => {
    const active = selectedWriter === key;
    return (
      <button
        key={key ?? '__all__'}
        onClick={() => setSelectedWriter(key)}
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
          <h1 className="text-3xl font-bold text-foreground mb-2">영구 저작물 DB</h1>
          <p className="text-muted-foreground text-sm">
            출판사 관리 저작물{!isAdmin && ' · 수정은 관리자만 가능'}
          </p>
        </div>
        {isAdmin && (
          <Link
            href="/admin/works/permanent/new"
            className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition font-medium"
          >
            + 저작물 추가
          </Link>
        )}
      </div>

      {/* 본문: 좌측 자사작가 목록(sticky) + 우측 표 */}
      <div className="grid grid-cols-[180px_1fr] gap-6 items-start">
        {/* 좌측 자사작가 패널 — 스크롤 시 따라오는 sticky */}
        <aside className="sticky top-6 self-start bg-card border border-border rounded-lg p-2 max-h-[calc(100vh-7rem)] overflow-y-auto gradient-scroll transition-all duration-300">
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
              <div className="px-4 py-3 border-b border-border bg-primary/5 grid grid-cols-3 items-center">
                <span />
                <h2 className="text-sm font-bold text-foreground text-center">
                  {selectedWriter ?? '전체보기'}
                </h2>
                <span className="text-xs text-muted-foreground tabular-nums text-right">
                  {selectedWriter ? `${works.length}건` : `${works.length} / ${total}건`}
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs table-fixed min-w-[760px]">
                  <thead className="bg-primary/10 border-b border-border">
                    <tr>
                      <SortableHeader label="NO." sortKey="no" activeKey={sortKey} dir={dir} onSort={toggle} align="center" className={`${TH_CLASS} w-14`} />
                      <SortableHeader label="KOMCA 코드" sortKey="komca_code" activeKey={sortKey} dir={dir} onSort={toggle} align="center" className={`${TH_CLASS} w-36`} />
                      {/* 곡명·아티스트는 유연 컬럼 — 여분 폭을 흡수 */}
                      <SortableHeader label="곡명" sortKey="song_title" activeKey={sortKey} dir={dir} onSort={toggle} align="center" className={TH_CLASS} />
                      <SortableHeader label="아티스트" sortKey="artist" activeKey={sortKey} dir={dir} onSort={toggle} align="center" className={TH_CLASS} />
                      <SortableHeader label="ISWC" sortKey="iswc" activeKey={sortKey} dir={dir} onSort={toggle} align="center" className={`${TH_CLASS} w-40`} />
                      <SortableHeader label="공표일자" sortKey="publish_date" activeKey={sortKey} dir={dir} onSort={toggle} align="center" className={`${TH_CLASS} w-28`} />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {sorted.map((w) => (
                      <tr
                        key={w.id}
                        id={`row-${w.id}`}
                        className="hover:bg-primary/5 text-center text-foreground cursor-context-menu"
                        onContextMenu={(e) => { e.preventDefault(); setContextMenu({ id: w.id, no: w.no, title: w.song_title, x: e.clientX, y: e.clientY }); }}
                      >
                        <td className="px-3 py-3 tabular-nums">{w.no}</td>
                        <td className="px-3 py-3 tabular-nums whitespace-nowrap" title={w.komca_code}>{w.komca_code}</td>
                        <td className="px-3 py-3 truncate" title={w.song_title}>{w.song_title}</td>
                        <td className="px-3 py-3 truncate" title={w.artist ?? ''}>{w.artist ?? '-'}</td>
                        <td className="px-3 py-3 tabular-nums whitespace-nowrap truncate" title={w.iswc ?? ''}>{w.iswc ?? '-'}</td>
                        <td className="px-3 py-3 tabular-nums whitespace-nowrap">{formatDate(w.publish_date)}</td>
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
                    className="px-5 py-2 text-sm border border-border text-foreground rounded-lg hover:bg-muted transition font-medium cursor-pointer"
                  >
                    더보기 ({works.length} / {total})
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 우클릭 컨텍스트 메뉴 — 상세보기(전체) / 삭제(ADMIN) */}
      {contextMenu && (
        <div
          className="fixed z-50 bg-card border border-border rounded-lg shadow-lg py-1 min-w-[140px]"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* 어떤 행을 우클릭했는지 표시 */}
          <div className="px-3 py-2 border-b border-border">
            <p className="text-xs font-semibold text-foreground">NO. {contextMenu.no}</p>
            <p className="text-[11px] text-muted-foreground truncate max-w-[180px]" title={contextMenu.title}>{contextMenu.title}</p>
          </div>
          <button
            onClick={() => { setDetailId(contextMenu.id); setContextMenu(null); }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-primary/10 transition cursor-pointer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" />
            </svg>
            상세보기
          </button>
          {isAdmin && (
            <button
              onClick={() => { setConfirmDeleteId(contextMenu.id); setContextMenu(null); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 transition cursor-pointer"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
              </svg>
              삭제
            </button>
          )}
        </div>
      )}

      {/* 상세보기 모달 */}
      {detailId && <WorkDetailModal workId={detailId} onClose={() => setDetailId(null)} />}

      {/* 삭제 확인 다이얼로그 */}
      {confirmDeleteId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => setConfirmDeleteId(null)}
        >
          <div
            className="bg-card border border-border rounded-xl shadow-xl p-6 w-[320px] text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-sm text-foreground mb-5">정말로 삭제하시겠습니까?</p>
            <div className="flex justify-center gap-2">
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="px-4 py-2 text-sm border border-border text-foreground rounded-lg hover:bg-muted transition cursor-pointer"
              >
                취소
              </button>
              <button
                onClick={() => performDelete(confirmDeleteId)}
                className="px-4 py-2 text-sm bg-red-500/90 text-white rounded-lg hover:bg-red-500 transition cursor-pointer"
              >
                확인
              </button>
            </div>
          </div>
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
