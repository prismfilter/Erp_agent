// 일반 저작물 DB — 저작물 DB > 일반 (일반작가 저작물 관리 예정)
// 데이터 모델·표 구성은 추후 설계. 현재는 안내용 플레이스홀더.

import { PageHeader } from '@/components/layout/PageHeader';

export default function GeneralWorksPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="일반 저작물 DB" description="일반작가 저작물 관리" />

      <div className="bg-card border border-border rounded-lg p-12 text-center w-full max-w-3xl mx-auto">
        <div className="text-4xl mb-3" aria-hidden="true">🎼</div>
        <p className="text-foreground font-medium mb-1">준비 중인 페이지입니다</p>
        <p className="text-muted-foreground text-sm">
          일반작가 저작물 데이터 구조가 확정되면 이곳에서 관리할 수 있습니다.
        </p>
      </div>
    </div>
  );
}
