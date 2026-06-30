// 거래처 단일 조회(STAFF↑) / 수정(ADMIN) / 삭제(ADMIN)

import { NextRequest, NextResponse } from 'next/server';
import { requireStaff, isErrorResponse } from '@/lib/auth/apiAuth';
import { serverError, dbError } from '@/lib/api/respond';
import { parseBody, readJson } from '@/lib/validation/parse';
import { clientUpdateSchema } from '@/lib/validation/schemas';

// PATCH로 갱신 가능한 컬럼 화이트리스트(스키마와 1:1). 전송된 값만 부분 갱신.
const PATCHABLE_FIELDS = [
  'name',
  'is_active',
  'representative',
  'business_number',
  'address',
  'manager_name',
  'contact_phone',
  'contact_email',
  'department_title',
  'bank_name',
  'account_number',
  'account_holder',
] as const;

// GET /api/clients/[id] — 단일 거래처 전체 필드 (상세 페이지용)
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireStaff();
    if (isErrorResponse(auth)) return auth;

    const { id } = await params;
    const { data, error } = await auth.adminClient
      .from('clients')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      // PGRST116 = 결과 없음
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: '거래처를 찾을 수 없습니다.' }, { status: 404 });
      }
      return dbError('거래처 단일 조회 API 오류', error);
    }

    return NextResponse.json({ client: data });
  } catch (err) {
    return serverError('거래처 단일 조회 API 오류', err);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireStaff(true);
    if (isErrorResponse(auth)) return auth;

    const { id } = await params;
    const body = await readJson(req);
    if (!body.success) return body.response;
    const parsed = parseBody(clientUpdateSchema, body.data);
    if (!parsed.success) return parsed.response;

    // 전송된 필드만 부분 갱신 (undefined 제외, null은 클리어 의미로 반영)
    const data = parsed.data as Record<string, unknown>;
    const updates: Record<string, unknown> = {};
    for (const field of PATCHABLE_FIELDS) {
      if (data[field] !== undefined) updates[field] = data[field];
    }
    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: '변경할 내용이 없습니다.' }, { status: 400 });
    }

    const { data: updated, error } = await auth.adminClient
      .from('clients')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: '이미 존재하는 거래처명입니다.' }, { status: 409 });
      }
      return dbError('거래처 수정 API 오류', error);
    }

    return NextResponse.json({ client: updated });
  } catch (err) {
    return serverError('거래처 수정 API 오류', err);
  }
}

// DELETE /api/clients/[id] — 영구 삭제 (ADMIN only)
// 거래처는 청구서(invoices.client_id)가 FK로 참조 → 사용 중이면 DB가 막음(23503).
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireStaff(true);
    if (isErrorResponse(auth)) return auth;

    const { id } = await params;
    const { error } = await auth.adminClient.from('clients').delete().eq('id', id);

    if (error) {
      if (error.code === '23503') {
        return NextResponse.json(
          { error: '청구서에서 사용 중인 거래처는 삭제할 수 없습니다. 미사용으로 전환하세요.' },
          { status: 409 }
        );
      }
      return dbError('거래처 삭제 API 오류', error);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return serverError('거래처 삭제 API 오류', err);
  }
}
