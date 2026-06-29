'use client';

import { PageHeader } from '@/components/layout/PageHeader';

export default function WriterPortalPage() {
  return (
    <div>
      <PageHeader
        title="나의 정산서"
        titleClassName="text-2xl"
        className="mb-6"
      />
      <div className="bg-card rounded-lg border border-border p-8 text-center">
        <p className="text-muted-foreground">완료된 정산서 목록이 표시됩니다.</p>
      </div>
    </div>
  );
}
