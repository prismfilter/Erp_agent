'use client';

import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';

// 해외 저작권료 정산 — 음악 저작권 수익을 전속작가에게 배분하는 정산
export default function RoyaltySettlementPage() {
  return (
    <div>
      {/* 아이콘은 장식 요소이므로 제거하고 PageHeader로 통일 */}
      <PageHeader
        title="해외 저작권료 정산"
        description="음악 저작권 수익을 작가별로 배분합니다."
        titleClassName="text-2xl"
        className="mb-6"
        actions={
          <Link href="/settlement/new?type=royalty">
            <Button className="bg-blue-600 cursor-pointer">
              <Plus className="w-4 h-4 mr-2" />새 해외 저작권료 정산
            </Button>
          </Link>
        }
      />
      <div className="bg-card border border-border rounded-lg p-8 text-center">
        <p className="text-muted-foreground">해외 저작권료 정산 목록이 표시됩니다.</p>
      </div>
    </div>
  );
}
