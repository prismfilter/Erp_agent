'use client';

// 저작물 수정 페이지 — 상세 팝업과 같은 디자인의 전체 페이지에서 수정(ADMIN only)
// 목록 우클릭 '수정하기'에서 진입. 작품 정보 + 원작자 목록을 불러와 수정 후 저장.

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import type { WorkDetail } from '@/types/invoice';
import { WorkForm, type WorkFormInitial, type WorkSubmitPayload } from '@/components/works/WorkForm';

export default function WorkEditPage() {
  const router = useRouter();
  const params = useParams();
  const id = String(params.id);
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN';

  const [initial, setInitial] = useState<WorkFormInitial | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch(`/api/works/${id}`);
        if (!res.ok) throw new Error((await res.json()).error || '저작물을 불러올 수 없습니다.');
        const work: WorkDetail = (await res.json()).work;
        if (!active) return;
        setInitial({
          no: String(work.no),
          komca_code: work.komca_code,
          song_title: work.song_title,
          song_title_en: work.song_title_en ?? '',
          artist: work.artist ?? '',
          artist_en: work.artist_en ?? '',
          publish_date: work.publish_date ? work.publish_date.slice(0, 10) : '',
          iswc: work.iswc ?? '',
          authors: work.authors.map((a) => ({
            role: a.role ?? '',
            author_code: a.author_code ?? '',
            author_name: a.author_name ?? '',
            author_name_en: a.author_name_en ?? '',
            performance_right: a.performance_right != null ? String(a.performance_right) : '',
            reproduction_right: a.reproduction_right != null ? String(a.reproduction_right) : '',
          })),
        });
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : '오류가 발생했습니다.');
      } finally {
        if (active) setIsLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [id]);

  // 수정(PATCH) — 성공 시 목록으로 이동, 실패 시 에러 메시지 반환
  const handleUpdate = async (payload: WorkSubmitPayload): Promise<string | null> => {
    try {
      const res = await fetch(`/api/works/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        router.push('/admin/works/permanent');
        return null;
      }
      return (await res.json()).error || '수정 실패';
    } catch {
      return '수정 중 오류가 발생했습니다.';
    }
  };

  if (!isAdmin) {
    return (
      <div className="bg-card border border-border rounded-lg p-8 text-center">
        <p className="text-muted-foreground">저작물 수정은 관리자만 가능합니다.</p>
        <Link href="/admin/works/permanent" className="inline-block mt-4 text-sm text-primary hover:underline">
          목록으로 돌아가기
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* 상세 팝업과 같은 카드 디자인 — 가운데 정렬 헤더 */}
      <div className="bg-card border border-border rounded-xl shadow-sm">
        <div className="relative flex items-center justify-center px-5 py-4 border-b border-border">
          <h1 className="text-lg font-bold text-foreground">저작물 수정</h1>
          <Link
            href="/admin/works/permanent"
            className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition cursor-pointer"
            aria-label="닫기"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </Link>
        </div>

        <div className="p-5">
          {isLoading ? (
            <div className="py-10 text-center">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-border border-t-primary mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">불러오는 중...</p>
            </div>
          ) : error ? (
            <p className="text-red-400 text-sm text-center py-10">오류: {error}</p>
          ) : initial ? (
            <WorkForm
              initial={initial}
              submitLabel="수정"
              submittingLabel="수정 중..."
              cancelHref="/admin/works/permanent"
              clickToEdit
              onSubmit={handleUpdate}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
