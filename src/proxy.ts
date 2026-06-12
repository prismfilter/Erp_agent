// Next.js 16 프록시(구 middleware) — 매 요청마다 Supabase 세션을 갱신하고
// 미인증 사용자의 보호 라우트 접근을 서버단에서 차단한다.
// Supabase SSR 공식 권장 패턴: 미들웨어가 없으면 토큰 갱신이 응답 쿠키에 기록되지
// 않아 반복 로그아웃이 발생한다.

import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// 미인증 접근이 허용되는 공개 경로 (로그인·OAuth 콜백 등)
const PUBLIC_PATHS = ['/login', '/auth', '/auth-code-error'];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'));
}

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // 갱신된 토큰을 요청·응답 양쪽 쿠키에 기록 (공식 패턴)
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // getUser()로 세션 검증 및 토큰 갱신 트리거
  const { data: { user } } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // 미인증 + 보호 경로 → 로그인으로 리다이렉트
  if (!user && !isPublicPath(pathname)) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    return NextResponse.redirect(loginUrl);
  }

  // 인증 상태로 로그인 페이지 접근 → 홈으로
  if (user && pathname === '/login') {
    const homeUrl = request.nextUrl.clone();
    homeUrl.pathname = '/';
    return NextResponse.redirect(homeUrl);
  }

  return response;
}

export const config = {
  // 정적 자산·이미지·API 라우트는 제외 (API는 자체 requireStaff로 보호)
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
