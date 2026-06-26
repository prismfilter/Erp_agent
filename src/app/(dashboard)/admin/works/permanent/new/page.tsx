'use client';

// 저작물 신규 등록 페이지 — 작품 정보 + 원작자 다건 입력 후 등록(ADMIN only)
// 목록의 '+ 저작물 추가'에서 진입. 등록 성공 시 목록으로 복귀.

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { WorkForm, type WorkSubmitPayload } from '@/components/works/WorkForm';

export default function WorkNewPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN';

  // 등록(POST) — 성공 시 목록으로 이동, 실패 시 에러 메시지 반환
  const handleCreate = async (payload: WorkSubmitPayload): Promise<string | null> => {
    try {
      const res = await fetch('/api/works', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        router.push('/admin/works/permanent');
        return null;
      }
      return (await res.json()).error || '등록 실패';
    } catch {
      return '등록 중 오류가 발생했습니다.';
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
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">저작물 추가</h1>
        <p className="text-muted-foreground text-sm">작품 정보와 원작자를 입력해 등록합니다.</p>
      </div>

      <WorkForm
        submitLabel="등록"
        submittingLabel="등록 중..."
        cancelHref="/admin/works/permanent"
        onSubmit={handleCreate}
      />
    </div>
  );
}
