import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next') || '/';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const forwardedHost = request.headers.get('x-forwarded-host');
      const proto = request.headers.get('x-forwarded-proto');
      const host = forwardedHost || request.headers.get('host');
      const redirectUrl = proto && host ? `${proto}://${host}${next}` : next;
      return NextResponse.redirect(redirectUrl);
    }
  }

  // error redirect
  return NextResponse.redirect(new URL('/auth/auth-code-error', requestUrl.origin));
}
