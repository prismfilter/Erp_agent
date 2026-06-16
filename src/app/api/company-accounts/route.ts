// 회사 입금계좌 목록 / 즉시 등록

import { NextRequest, NextResponse } from 'next/server';
import { requireStaff, isErrorResponse } from '@/lib/auth/apiAuth';
import { parseBody } from '@/lib/validation/parse';
import { companyAccountCreateSchema } from '@/lib/validation/schemas';

export async function GET() {
  try {
    const auth = await requireStaff();
    if (isErrorResponse(auth)) return auth;

    const { data, error } = await auth.adminClient
      .from('company_accounts')
      .select('*')
      .order('is_default', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ accounts: data });
  } catch (err) {
    console.error('회사 계좌 API 오류:', err);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

// POST /api/company-accounts — 은행명+계좌번호 쌍으로 조회/등록 (이미 있으면 기존 반환)
export async function POST(request: NextRequest) {
  try {
    const auth = await requireStaff();
    if (isErrorResponse(auth)) return auth;

    const parsed = parseBody(companyAccountCreateSchema, await request.json());
    if (!parsed.success) return parsed.response;
    const bank_name = parsed.data.bank_name.trim();
    const account_number = parsed.data.account_number.trim();

    // 동일 은행명+계좌번호 존재 시 기존 반환
    const { data: existing } = await auth.adminClient
      .from('company_accounts')
      .select('*')
      .eq('bank_name', bank_name)
      .eq('account_number', account_number)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ account: existing });
    }

    const { data, error } = await auth.adminClient
      .from('company_accounts')
      .insert({ bank_name, account_number })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ account: data }, { status: 201 });
  } catch (err) {
    console.error('회사 계좌 등록 API 오류:', err);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
