// 작가 마스터 수정·삭제 (ADMIN only)

import { NextRequest, NextResponse } from 'next/server';
import { requireStaff, isErrorResponse } from '@/lib/auth/apiAuth';
import { parseBody } from '@/lib/validation/parse';
import { writerUpdateSchema } from '@/lib/validation/schemas';
import { needsRecode, nextWriterCode } from '@/lib/writers/writerCode';

const WRITER_SELECT =
  'id, writer_code, name, writer_type, fee_rate, permanent_rate, general_rate, recontract_date, english_name, stage_name, position, original_writer_code, status, created_at';

// GET /api/writers/[id] — 작가 단건 조회 (STAFF↑)
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireStaff();
    if (isErrorResponse(auth)) return auth;

    const { id } = await params;
    const { data, error } = await auth.adminClient
      .from('writers')
      .select(WRITER_SELECT)
      .eq('id', id)
      .single();

    if (error?.code === 'PGRST116') {
      return NextResponse.json({ error: '작가를 찾을 수 없습니다.' }, { status: 404 });
    }
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ writer: data });
  } catch (err) {
    console.error('작가 상세 조회 API 오류:', err);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

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

    // 구분 변경 트리거: 접두사가 달라지면 새 prefix의 다음 번호로 코드 재배정.
    // writer_code는 직접 수정 불가하므로, 오직 이 경로로만 변경된다.
    if (parsed.data.writer_type !== undefined) {
      const { data: current } = await auth.adminClient
        .from('writers')
        .select('writer_code')
        .eq('id', id)
        .single();
      if (current && needsRecode(current.writer_code as string | null, parsed.data.writer_type)) {
        const { data: rows } = await auth.adminClient
          .from('writers')
          .select('writer_code')
          .neq('id', id);
        const codes = (rows ?? [])
          .map((r) => r.writer_code as string | null)
          .filter((c): c is string => !!c);
        updates.writer_code = nextWriterCode(codes, parsed.data.writer_type);
      }
    }

    const { data, error } = await auth.adminClient
      .from('writers')
      .update(updates)
      .eq('id', id)
      .select(WRITER_SELECT)
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
