import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next') || '/';

  // Cloudflare Tunnel 등 프록시 환경에서도 외부 URL로 리다이렉트
  const forwardedHost = request.headers.get('x-forwarded-host');
  const proto = request.headers.get('x-forwarded-proto') || 'https';
  const host = forwardedHost || request.headers.get('host') || 'localhost:3001';
  const externalOrigin = forwardedHost ? `${proto}://${host}` : requestUrl.origin;

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(`${externalOrigin}${next}`);
    }
  }

  // 에러 시에도 외부 URL 기준으로 로그인 페이지로 이동
  return NextResponse.redirect(`${externalOrigin}/login`);
}
