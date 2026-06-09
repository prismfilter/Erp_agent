'use client';

import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Plus } from 'lucide-react';

export default function SettlementPage() {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">정산 관리</h1>
        <Link href="/settlement/new">
          <Button className="bg-blue-600">
            <Plus className="w-4 h-4 mr-2" />
            새 정산
          </Button>
        </Link>
      </div>
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
        <p className="text-gray-600">정산 목록이 표시됩니다.</p>
      </div>
    </div>
  );
}
