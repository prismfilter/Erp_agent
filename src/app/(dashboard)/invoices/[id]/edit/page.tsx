'use client';

// 청구서 수정

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import type { Invoice } from '@/types/invoice';
import { InvoiceForm } from '@/components/invoice/InvoiceForm';

export default function EditInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/invoices/${id}`);
        if (!res.ok) throw new Error((await res.json()).error || '조회 실패');
        setInvoice((await res.json()).invoice);
      } catch (err) {
        setError(err instanceof Error ? err.message : '오류가 발생했습니다.');
      } finally {
        setIsLoading(false);
      }
    })();
  }, [id]);

  if (isLoading) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin rounded-full h-6 w-6 border-2 border-border border-t-primary mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">청구서 로딩 중...</p>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-400 mb-4">오류: {error ?? '청구서를 찾을 수 없습니다.'}</p>
        <Link href="/invoices" className="text-primary text-sm hover:underline">← 목록으로</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">청구서 수정</h1>
        <p className="text-muted-foreground text-sm">{invoice.title}</p>
      </div>
      <InvoiceForm invoice={invoice} />
    </div>
  );
}
