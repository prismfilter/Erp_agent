// 프라이스 테이블 목록 / 추가

import { NextRequest, NextResponse } from 'next/server';
import { requireStaff, isErrorResponse } from '@/lib/auth/apiAuth';
import { serverError, dbError } from '@/lib/api/respond';
import { parseBody, readJson } from '@/lib/validation/parse';
import { priceItemCreateSchema } from '@/lib/validation/schemas';

// 휴지통 보관 기간 (30일) — 경과 항목은 조회 시 자동 영구삭제
const TRASH_RETENTION_DAYS = 30;

// GET /api/price-items
//   ?all=1   비활성 포함 (관리 페이지용)
//   ?trash=1 휴지통(삭제된 항목)만 조회
export async function GET(request: NextRequest) {
  try {
    const auth = await requireStaff();
    if (isErrorResponse(auth)) return auth;

    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get('all') === '1';
    const trash = searchParams.get('trash') === '1';

    // 지연 정리: 휴지통 30일 경과 항목 영구삭제 (별도 cron 불필요)
    const cutoff = new Date(Date.now() - TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();
    await auth.adminClient
      .from('price_items')
      .delete()
      .not('deleted_at', 'is', null)
      .lt('deleted_at', cutoff);

    let query = auth.adminClient
      .from('price_items')
      .select('*')
      .order('category')
      .order('sort_order');

    if (trash) {
      // 휴지통: 삭제된 항목만
      query = query.not('deleted_at', 'is', null);
    } else {
      // 일반: 삭제되지 않은 항목만
      query = query.is('deleted_at', null);
      if (!includeInactive) query = query.eq('is_active', true);
    }

    const { data, error } = await query;
    if (error) {
      return dbError('프라이스 테이블 API 오류', error);
    }

    return NextResponse.json({ priceItems: data });
  } catch (err) {
    return serverError('프라이스 테이블 API 오류', err);
  }
}

// POST /api/price-items — 항목 추가 (ADMIN only)
export async function POST(request: NextRequest) {
  try {
    const auth = await requireStaff(true);
    if (isErrorResponse(auth)) return auth;

    const body = await readJson(request);
    if (!body.success) return body.response;
    const parsed = parseBody(priceItemCreateSchema, body.data);
    if (!parsed.success) return parsed.response;
    const { category, name, billing_price, writer_base_pay, fee_rate, is_formula, formula_note, sort_order } = parsed.data;

    const { data, error } = await auth.adminClient
      .from('price_items')
      .insert({
        category,
        name,
        billing_price: billing_price ?? null,
        writer_base_pay: writer_base_pay ?? null,
        fee_rate: fee_rate ?? 0.2,
        is_formula: is_formula ?? false,
        formula_note: formula_note ?? null,
        sort_order: sort_order ?? 999,
      })
      .select()
      .single();

    if (error) {
      return dbError('프라이스 테이블 추가 API 오류', error);
    }

    return NextResponse.json({ priceItem: data }, { status: 201 });
  } catch (err) {
    return serverError('프라이스 테이블 추가 API 오류', err);
  }
}
