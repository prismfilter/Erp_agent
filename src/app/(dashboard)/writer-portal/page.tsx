'use client';

export default function WriterPortalPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground mb-6">나의 정산서</h1>
      <div className="bg-card rounded-lg border border-border p-8 text-center">
        <p className="text-muted-foreground">완료된 정산서 목록이 표시됩니다.</p>
      </div>
    </div>
  );
}
