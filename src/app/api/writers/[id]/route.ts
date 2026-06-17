// 작가 마스터 수정·삭제 (ADMIN only)

import { NextRequest, NextResponse } from 'next/server';
import { requireStaff, isErrorResponse } from '@/lib/auth/apiAuth';
import { parseBody } from '@/lib/validation/parse';
import { writerUpdateSchema } from '@/lib/validation/schemas';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireStaff(true);
    if (isErrorResponse(auth)) return auth;

    const { id } = await params;
    const parsed = parseBody(writerUpdateSchema, await request.json());
    if (!parsed.success) return parsed.response;

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    for (const [key, value] of Object.entries(parsed.data)) {
      if (value !== undefined) updates[key] = value;
    }

    const { data, error } = await auth.adminClient
      .from('writers')
      .update(updates)
      .eq('id', id)
      .select('id, name, writer_type, fee_rate, permanent_rate, general_rate, recontract_date, status, created_at')
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: '이미 등록된 작가명입니다.' }, { status: 409 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ writer: data });
  } catch (err) {
    console.error('작가 마스터 수정 API 오류:', err);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

// DELETE /api/writers/[id] — 영구 삭제 (writers는 청구서가 텍스트로 작업자명을 저장하므로 참조 무결성 영향 없음)
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireStaff(true);
    if (isErrorResponse(auth)) return auth;

    const { id } = await params;
    const { error } = await auth.adminClient.from('writers').delete().eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('작가 마스터 삭제 API 오류:', err);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
