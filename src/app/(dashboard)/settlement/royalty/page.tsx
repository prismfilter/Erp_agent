'use client';

import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Plus, Music } from 'lucide-react';

// 저작권료 정산 — 음악 저작권 수익을 전속작가에게 배분하는 정산
export default function RoyaltySettlementPage() {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <Music className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-2xl font-bold">저작권료 정산</h1>
            <p className="text-sm text-muted-foreground">음악 저작권 수익을 작가별로 배분합니다.</p>
          </div>
        </div>
        <Link href="/settlement/new?type=royalty">
          <Button className="bg-blue-600 cursor-pointer">
            <Plus className="w-4 h-4 mr-2" />새 저작권료 정산
          </Button>
        </Link>
      </div>
      <div className="bg-card border border-border rounded-lg p-8 text-center">
        <p className="text-muted-foreground">저작권료 정산 목록이 표시됩니다.</p>
      </div>
    </div>
  );
}
