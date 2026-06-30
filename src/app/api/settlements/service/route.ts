// 용역 정산 — 계산(비영속)
// 입금 완료(status='paid')된 청구서 중 paid_at이 선택 기간에 드는 건에서,
// 선택 작가의 내부 항목 작가지급액을 합산해 정산서를 계산만 해 반환한다(DB 저장 없음 — 일회성).

import { NextRequest, NextResponse } from 'next/server';
import { requireStaff, isErrorResponse } from '@/lib/auth/apiAuth';
import { serverError, dbError } from '@/lib/api/respond';
import { parseBody, readJson } from '@/lib/validation/parse';
import { serviceSettlementCreateSchema } from '@/lib/validation/schemas';
import { getInternalItems, calcItemBreakdown } from '@/lib/invoice/calculator';
import { buildSettlementRows, settlementKey } from '@/lib/settlement/serviceRows';
import type { Invoice, InvoiceItem, ServiceSettlement, ServiceSettlementDetailItem } from '@/types/invoice';

// GET /api/settlements/service — paid 청구서에서 (작가 × 거래) 목록 행 + 상태를 반환(행은 비영속, 상태만 영속)
export async function GET() {
  try {
    const auth = await requireStaff();
    if (isErrorResponse(auth)) return auth;

    // 입금 완료 청구서 + 내부 항목
    const { data: invoicesData, error: invErr } = await auth.adminClient
      .from('invoices')
      .select('*, client:clients(*), items:invoice_items(*)')
      .eq('status', 'paid')
      .order('paid_at', { ascending: false });

    if (invErr) {
      return dbError('용역 정산 목록 API 오류', invErr);
    }

    // 정산완료 상태(레코드 존재 = 정산완료)
    const { data: statusData, error: statusErr } = await auth.adminClient
      .from('service_settlement_status')
      .select('invoice_id, writer_name');

    if (statusErr) {
      return dbError('용역 정산 상태 조회 API 오류', statusErr);
    }

    const settledKeys = new Set(
      (statusData ?? []).map((s) => settlementKey(s.invoice_id as string, s.writer_name as string)),
    );

    const rows = buildSettlementRows((invoicesData ?? []) as Invoice[], settledKeys);

    return NextResponse.json({ rows });
  } catch (err) {
    return serverError('용역 정산 목록 API 오류', err);
  }
}

// POST /api/settlements/service — 정산 계산(저장하지 않고 결과만 반환)
export async function POST(request: NextRequest) {
  try {
    const auth = await requireStaff();
    if (isErrorResponse(auth)) return auth;

    const json = await readJson(request);
    if (!json.success) return json.response;
    const parsed = parseBody(serviceSettlementCreateSchema, json.data);
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
      return dbError('용역 정산 계산 API 오류', invErr);
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
    return serverError('용역 정산 계산 API 오류', err);
  }
}
