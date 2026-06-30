// 용역 정산 상태 토글 — (invoice_id, writer_name) 행을 정산완료/미정산으로 전환.
// 레코드 존재 = 정산완료. settled=true면 upsert(멱등), false면 delete.

import { NextRequest, NextResponse } from 'next/server';
import { requireStaff, isErrorResponse } from '@/lib/auth/apiAuth';
import { serverError, dbError } from '@/lib/api/respond';
import { parseBody, readJson } from '@/lib/validation/parse';
import { serviceSettlementStatusSchema } from '@/lib/validation/schemas';

// POST /api/settlements/service/status — { invoice_id, writer_name, settled }
export async function POST(request: NextRequest) {
  try {
    const auth = await requireStaff();
    if (isErrorResponse(auth)) return auth;

    const body = await readJson(request);
    if (!body.success) return body.response;
    const parsed = parseBody(serviceSettlementStatusSchema, body.data);
    if (!parsed.success) return parsed.response;
    const { invoice_id, writer_name, settled } = parsed.data;

    if (settled) {
      // 정산완료 — UNIQUE(invoice_id, writer_name)로 멱등 upsert
      const { error } = await auth.adminClient
        .from('service_settlement_status')
        .upsert(
          { invoice_id, writer_name, settled_by: auth.userId },
          { onConflict: 'invoice_id,writer_name', ignoreDuplicates: true },
        );
      if (error) {
        return dbError('용역 정산 상태 변경 API 오류', error);
      }
    } else {
      // 미정산 — 레코드 제거
      const { error } = await auth.adminClient
        .from('service_settlement_status')
        .delete()
        .eq('invoice_id', invoice_id)
        .eq('writer_name', writer_name);
      if (error) {
        return dbError('용역 정산 상태 변경 API 오류', error);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return serverError('용역 정산 상태 변경 API 오류', err);
  }
}
