// 프라이스 테이블 항목 수정·비활성화 (ADMIN only)

import { NextRequest, NextResponse } from 'next/server';
import { requireStaff, isErrorResponse } from '@/lib/auth/apiAuth';
import { serverError, dbError } from '@/lib/api/respond';
import { parseBody, readJson } from '@/lib/validation/parse';
import { priceItemUpdateSchema } from '@/lib/validation/schemas';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireStaff(true);
    if (isErrorResponse(auth)) return auth;

    const { id } = await params;
    const body = await readJson(request);
    if (!body.success) return body.response;
    const parsed = parseBody(priceItemUpdateSchema, body.data);
    if (!parsed.success) return parsed.response;

    // 검증된 필드만 반영 (undefined 제외)
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    for (const [key, value] of Object.entries(parsed.data)) {
      if (value !== undefined) updates[key] = value;
    }

    const { data, error } = await auth.adminClient
      .from('price_items')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return dbError('프라이스 테이블 수정 API 오류', error);
    }

    return NextResponse.json({ priceItem: data });
  } catch (err) {
    return serverError('프라이스 테이블 수정 API 오류', err);
  }
}

// DELETE /api/price-items/[id]
//   ?permanent=1 영구 삭제, 그 외 휴지통으로 이동(soft delete)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireStaff(true);
    if (isErrorResponse(auth)) return auth;

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const permanent = searchParams.get('permanent') === '1';

    if (permanent) {
      // 영구 삭제 (FK는 ON DELETE SET NULL — 과거 청구서 데이터는 보존)
      const { error } = await auth.adminClient.from('price_items').delete().eq('id', id);
      if (error) {
        return dbError('프라이스 테이블 삭제 API 오류', error);
      }
    } else {
      // 휴지통으로 이동 (soft delete)
      const { error } = await auth.adminClient
        .from('price_items')
        .update({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) {
        return dbError('프라이스 테이블 삭제 API 오류', error);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return serverError('프라이스 테이블 삭제 API 오류', err);
  }
}
