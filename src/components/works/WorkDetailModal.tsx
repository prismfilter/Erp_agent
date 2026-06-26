'use client';

// 저작물 상세 보기 모달 — 목록 필드 + 영문명 + 원작자 목록(공연권/복제권)
// 우클릭 컨텍스트 메뉴의 '상세보기'에서 진입. /api/works/[id] 중첩 조회 결과를 표시.

import { useEffect, useState } from 'react';
import type { WorkDetail, WorkAuthorRole } from '@/types/invoice';

// 포지션 코드 → 의미(툴팁용). A=작사 / C=작곡 / AR=편곡
const ROLE_LABEL: Record<WorkAuthorRole, string> = {
  A: '작사',
  C: '작곡',
  AR: '편곡',
};

// YYYY-MM-DD → YYYY.MM.DD (없으면 '-')
function formatDate(d: string | null): string {
  if (!d) return '-';
  return d.slice(0, 10).replace(/-/g, '.');
}

// 상단 요약 필드 한 칸
function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm text-foreground break-words">{value || '-'}</span>
    </div>
  );
}

interface WorkDetailModalProps {
  workId: string;
  onClose: () => void;
}

export function WorkDetailModal({ workId, onClose }: WorkDetailModalProps) {
  const [work, setWork] = useState<WorkDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch(`/api/works/${workId}`);
        if (!res.ok) throw new Error((await res.json()).error || '상세를 불러올 수 없습니다.');
        const json = await res.json();
        if (active) setWork(json.work);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : '오류가 발생했습니다.');
      } finally {
        if (active) setIsLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [workId]);

  // Esc로 닫기
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="bg-card border border-border rounded-xl shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-base font-bold text-foreground">저작물 상세</h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition cursor-pointer"
            aria-label="닫기"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 본문 (스크롤) */}
        <div className="flex-1 overflow-y-auto gradient-scroll px-5 py-4 space-y-5">
          {isLoading ? (
            <div className="py-10 text-center">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-border border-t-primary mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">불러오는 중...</p>
            </div>
          ) : error ? (
            <p className="text-red-400 text-sm text-center py-10">오류: {error}</p>
          ) : work ? (
            <>
              {/* 작품 메타 */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <DetailField label="NO." value={String(work.no)} />
                <DetailField label="KOMCA 코드" value={work.komca_code} />
                <DetailField label="공표일자" value={formatDate(work.publish_date)} />
                <DetailField label="곡명" value={work.song_title} />
                <DetailField label="영문 곡명" value={work.song_title_en ?? '-'} />
                <DetailField label="ISWC" value={work.iswc ?? '-'} />
                <DetailField label="아티스트" value={work.artist ?? '-'} />
                <DetailField label="영문 아티스트" value={work.artist_en ?? '-'} />
              </div>

              {/* 원작자 목록 */}
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-2">
                  원작자 <span className="text-muted-foreground font-normal">({work.authors.length}명)</span>
                </h3>
                <div className="border border-border rounded-lg overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-primary/10 border-b border-border">
                      <tr className="text-center text-muted-foreground">
                        <th className="px-2 py-2 font-medium">포지션</th>
                        <th className="px-2 py-2 font-medium">원작자코드</th>
                        <th className="px-2 py-2 font-medium text-left">원작자명</th>
                        <th className="px-2 py-2 font-medium text-left">영문명</th>
                        <th className="px-2 py-2 font-medium">공연권</th>
                        <th className="px-2 py-2 font-medium">복제권</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {work.authors.map((a) => (
                        <tr key={a.id} className="text-center text-foreground">
                          <td className="px-2 py-2 whitespace-nowrap" title={a.role ? ROLE_LABEL[a.role] : ''}>{a.role ?? '-'}</td>
                          <td className="px-2 py-2 tabular-nums whitespace-nowrap">{a.author_code ?? '-'}</td>
                          <td className="px-2 py-2 text-left">{a.author_name ?? '-'}</td>
                          <td className="px-2 py-2 text-left text-muted-foreground">{a.author_name_en ?? '-'}</td>
                          <td className="px-2 py-2 tabular-nums">{a.performance_right != null ? `${a.performance_right}%` : '-'}</td>
                          <td className="px-2 py-2 tabular-nums">{a.reproduction_right != null ? `${a.reproduction_right}%` : '-'}</td>
                        </tr>
                      ))}
                      {work.authors.length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-2 py-4 text-center text-muted-foreground">
                            등록된 원작자가 없습니다.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
