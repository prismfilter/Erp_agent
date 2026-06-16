import { createClient } from '@/lib/supabase/server';
import { isAllowedEmail } from '@/lib/auth/domain';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');

  // 오픈 리다이렉트 방지: next는 단일 슬래시로 시작하는 상대경로만 허용
  const rawNext = requestUrl.searchParams.get('next') || '/';
  const next = rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/';

  // Cloudflare Tunnel 등 프록시 환경에서도 외부 URL로 리다이렉트
  const forwardedHost = request.headers.get('x-forwarded-host');
  const proto = request.headers.get('x-forwarded-proto') || 'https';
  const host = forwardedHost || request.headers.get('host') || 'localhost:3001';
  const externalOrigin = forwardedHost ? `${proto}://${host}` : requestUrl.origin;

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // 도메인 검증: 회사 계정(@prism-filter.com)이 아니면 즉시 로그아웃 후 차단
      if (!isAllowedEmail(data.user?.email)) {
        await supabase.auth.signOut();
        return NextResponse.redirect(`${externalOrigin}/auth-code-error?reason=domain`);
      }
      return NextResponse.redirect(`${externalOrigin}${next}`);
    }
  }

  // 에러 시 안내 페이지로 이동
  return NextResponse.redirect(`${externalOrigin}/auth-code-error`);
}
