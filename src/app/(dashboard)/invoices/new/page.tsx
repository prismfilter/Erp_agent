'use client';

// 새 청구서 작성

import { InvoiceForm } from '@/components/invoice/InvoiceForm';

export default function NewInvoicePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">새 청구서</h1>
        <p className="text-muted-foreground text-sm">
          프라이스 테이블에서 항목을 선택하면 금액이 자동 입력됩니다. 협의가는 자유롭게 수정하세요.
        </p>
      </div>
      <InvoiceForm />
    </div>
  );
}
