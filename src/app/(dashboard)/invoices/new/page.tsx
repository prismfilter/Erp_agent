'use client';

// 청구서 작성

import { InvoiceForm } from '@/components/invoice/InvoiceForm';
import { PageHeader } from '@/components/layout/PageHeader';

export default function NewInvoicePage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="청구서 작성"
        description="프라이스 테이블에서 작업내용(항목)을 선택하면 금액이 자동 입력됩니다. 협의가는 자유롭게 수정하세요."
      />
      <InvoiceForm />
    </div>
  );
}
