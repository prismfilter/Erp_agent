// 작가 마스터 목록 / 등록 (로그인 계정과 무관한 작가/작업자 레지스트리)

import { NextRequest, NextResponse } from 'next/server';
import { requireStaff, isErrorResponse } from '@/lib/auth/apiAuth';
import { serverError, dbError } from '@/lib/api/respond';
import { parseBody, readJson } from '@/lib/validation/parse';
import { writerCreateSchema } from '@/lib/validation/schemas';
import { nextWriterCode } from '@/lib/writers/writerCode';

// 응답·조회 공통 컬럼(작가 코드 포함)
const WRITER_SELECT =
  'id, writer_code, name, writer_type, fee_rate, permanent_rate, general_rate, recontract_date, english_name, stage_name, stage_name_en, position, original_writer_code, status, created_at';

// GET /api/writers — 목록 (ADMIN/STAFF 조회)
export async function GET() {
  try {
    const auth = await requireStaff();
    if (isErrorResponse(auth)) return auth;

    const { data, error } = await auth.adminClient
      .from('writers')
      .select(WRITER_SELECT)
      .order('created_at', { ascending: false });

    if (error) {
      return dbError('작가 마스터 목록 API 오류', error);
    }

    return NextResponse.json({ writers: data });
  } catch (err) {
    return serverError('작가 마스터 목록 API 오류', err);
  }
}

// POST /api/writers — 작가 등록 (ADMIN only). writer_code는 서버가 자동 부여(클라 입력 무시).
export async function POST(request: NextRequest) {
  try {
    const auth = await requireStaff(true);
    if (isErrorResponse(auth)) return auth;

    const body = await readJson(request);
    if (!body.success) return body.response;
    const parsed = parseBody(writerCreateSchema, body.data);
    if (!parsed.success) return parsed.response;
    const { name, writer_type, fee_rate, permanent_rate, general_rate, recontract_date, english_name, stage_name, stage_name_en, position, original_writer_code } = parsed.data;

    // 동시 등록으로 코드가 겹치는 희박한 경우 대비 1회 재시도(UNIQUE 제약이 최종 방어선)
    let lastMessage = '작가 코드 생성에 실패했습니다.';
    for (let attempt = 0; attempt < 2; attempt++) {
      const { data: rows } = await auth.adminClient.from('writers').select('writer_code');
      const codes = (rows ?? [])
        .map((r) => r.writer_code as string | null)
        .filter((c): c is string => !!c);
      const writer_code = nextWriterCode(codes, writer_type);

      const { data, error } = await auth.adminClient
        .from('writers')
        .insert({
          writer_code,
          name,
          writer_type,
          fee_rate,
          permanent_rate: permanent_rate ?? null,
          general_rate: general_rate ?? null,
          recontract_date: recontract_date ?? null,
          english_name: english_name ?? null,
          stage_name: stage_name ?? null,
          stage_name_en: stage_name_en ?? null,
          position: position ?? [],
          original_writer_code: original_writer_code ?? null,
        })
        .select(WRITER_SELECT)
        .single();

      if (!error) return NextResponse.json({ writer: data }, { status: 201 });

      if (error.code === '23505' && error.message.includes('writer_code')) {
        lastMessage = error.message;
        continue; // 코드 충돌 → 재계산 재시도
      }
      if (error.code === '23505') {
        return NextResponse.json({ error: '이미 등록된 작가명입니다.' }, { status: 409 });
      }
      return dbError('작가 마스터 등록 API 오류', error);
    }
    return NextResponse.json({ error: lastMessage }, { status: 500 });
  } catch (err) {
    return serverError('작가 마스터 등록 API 오류', err);
  }
}
