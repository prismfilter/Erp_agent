'use client';

// 저작물 신규 등록 페이지 — 작품 정보 + 원작자 다건 입력 후 등록(ADMIN only)
// 목록의 '+ 저작물 추가'에서 진입. NO.는 다음 번호 자동 채움(중복 불가). 등록 성공 시 목록으로 복귀.

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { WorkForm, type WorkFormInitial, type WorkSubmitPayload } from '@/components/works/WorkForm';

export default function WorkNewPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN';

  const [initial, setInitial] = useState<WorkFormInitial | null>(null);

  // 다음 NO. 조회 후 폼 초기값 구성 (실패해도 빈 값으로 진행)
  useEffect(() => {
    let active = true;
    (async () => {
      let nextNo = '';
      try {
        const res = await fetch('/api/works/next-no');
        if (res.ok) nextNo = String((await res.json()).nextNo ?? '');
      } catch {
        // 무시 — NO.는 사용자가 직접 입력 가능
      }
      if (active) {
        setInitial({
          no: nextNo,
          komca_code: '',
          song_title: '',
          song_title_en: '',
          artist: '',
          artist_en: '',
          publish_date: '',
          iswc: '',
          authors: [],
        });
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  // 등록(POST) — 성공 시 {warning?} (ISWC 중복 안내), 실패 시 {error}
  const handleCreate = async (payload: WorkSubmitPayload): Promise<{ error?: string; warning?: string }> => {
    try {
      const res = await fetch('/api/works', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      return res.ok ? { warning: json.warning } : { error: json.error || '등록 실패' };
    } catch {
      return { error: '등록 중 오류가 발생했습니다.' };
    }
  };

  if (!isAdmin) {
    return (
      <div className="bg-card border border-border rounded-lg p-8 text-center">
        <p className="text-muted-foreground">저작물 등록은 관리자만 가능합니다.</p>
        <Link href="/admin/works/permanent" className="inline-block mt-4 text-sm text-primary hover:underline">
          목록으로 돌아가기
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 헤더 — 좌측 정렬(다른 페이지와 동일) */}
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">저작물 추가</h1>
        <p className="text-muted-foreground text-sm">작품 정보와 원작자를 입력해 등록합니다.</p>
      </div>

      {/* 헤더 아래 구분선 — 전체 폭으로 길게 */}
      <hr className="border-border" />

      {/* 구분선 아래 — 작품 정보 + 원작자 등록 폼(가운데 정렬) */}
      <div className="max-w-4xl mx-auto">
        {initial ? (
          <WorkForm
            initial={initial}
            submitLabel="등록"
            submittingLabel="등록 중..."
            cancelHref="/admin/works/permanent"
            onSubmit={handleCreate}
            onSuccess={() => router.push('/admin/works/permanent')}
          />
        ) : (
          <div className="py-10 text-center">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-border border-t-primary mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">불러오는 중...</p>
          </div>
        )}
      </div>
    </div>
  );
}
