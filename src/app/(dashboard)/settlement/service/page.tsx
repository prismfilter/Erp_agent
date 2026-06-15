'use client';

import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Plus, Briefcase } from 'lucide-react';

// 용역 정산 — 작가 용역 요율(%) 기반 작업 대가 정산
export default function ServiceSettlementPage() {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <Briefcase className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-2xl font-bold">용역 정산</h1>
            <p className="text-sm text-muted-foreground">작가 용역 요율(%)을 기준으로 작업 대가를 정산합니다.</p>
          </div>
        </div>
        <Link href="/settlement/new?type=service">
          <Button className="bg-blue-600 cursor-pointer">
            <Plus className="w-4 h-4 mr-2" />새 용역 정산
          </Button>
        </Link>
      </div>
      <div className="bg-card border border-border rounded-lg p-8 text-center">
        <p className="text-muted-foreground">용역 정산 목록이 표시됩니다.</p>
      </div>
    </div>
  );
}
