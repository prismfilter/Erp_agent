// 용역 정산 — 계산(비영속)
// 입금 완료(status='paid')된 청구서 중 paid_at이 선택 기간에 드는 건에서,
// 선택 작가의 내부 항목 작가지급액을 합산해 정산서를 계산만 해 반환한다(DB 저장 없음 — 일회성).

import { NextRequest, NextResponse } from 'next/server';
import { requireStaff, isErrorResponse } from '@/lib/auth/apiAuth';
import { parseBody } from '@/lib/validation/parse';
import { serviceSettlementCreateSchema } from '@/lib/validation/schemas';
import { getInternalItems, calcItemBreakdown } from '@/lib/invoice/calculator';
import type { Invoice, InvoiceItem, ServiceSettlement, ServiceSettlementDetailItem } from '@/types/invoice';

// POST /api/settlements/service — 정산 계산(저장하지 않고 결과만 반환)
export async function POST(request: NextRequest) {
  try {
    const auth = await requireStaff();
    if (isErrorResponse(auth)) return auth;

    const parsed = parseBody(serviceSettlementCreateSchema, await request.json());
    if (!parsed.success) return parsed.response;
    const { writer_name, period_start, period_end } = parsed.data;

    if (period_start > period_end) {
      return NextResponse.json({ error: '시작일이 종료일보다 늦습니다.' }, { status: 400 });
    }

    // 입금 완료 시각(paid_at) 기준 기간 매칭 — KST(+09:00) 경계로 종료일 하루 전체 포함
    const startTs = `${period_start}T00:00:00+09:00`;
    const endTs = `${period_end}T23:59:59.999+09:00`;

    const { data: invoicesData, error: invErr } = await auth.adminClient
      .from('invoices')
      .select('*, client:clients(*), items:invoice_items(*)')
      .eq('status', 'paid')
      .gte('paid_at', startTs)
      .lte('paid_at', endTs)
      .order('paid_at', { ascending: true });

    if (invErr) {
      return NextResponse.json({ error: invErr.message }, { status: 500 });
    }

    const invoices = (invoicesData ?? []) as Invoice[];

    // 선택 작가의 내부 항목 작가지급액 합산 + 스냅샷 생성
    const detail: ServiceSettlementDetailItem[] = [];
    let total = 0;
    for (const inv of invoices) {
      const internal = getInternalItems((inv.items ?? []) as InvoiceItem[]);
      for (const it of internal) {
        const names = it.writer_names.split(',').map((n) => n.trim()).filter(Boolean);
        if (!names.includes(writer_name)) continue;
        const { netSupply, writerPay, attribution } = calcItemBreakdown(it);
        total += writerPay;
        detail.push({
          invoice_id: inv.id,
          invoice_date: inv.invoice_date,
          paid_at: inv.paid_at,
          client_name: inv.client?.name ?? '',
          title: inv.title,
          description: it.description,
          writer_pay: writerPay,
          supply: netSupply,
          attribution,
        });
      }
    }

    if (detail.length === 0) {
      return NextResponse.json(
        { error: '선택한 기간에 해당 작가의 입금 완료 내역이 없습니다.' },
        { status: 400 }
      );
    }

    // 일회성 — DB 저장 없이 계산 결과만 반환(id/created_at은 임시값)
    const settlement: ServiceSettlement = {
      id: crypto.randomUUID(),
      writer_name,
      period_start,
      period_end,
      total_amount: total,
      detail,
      created_at: new Date().toISOString(),
    };

    return NextResponse.json({ settlement });
  } catch (err) {
    console.error('용역 정산 계산 API 오류:', err);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
