'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export default function LoginPage() {
  const router = useRouter();
  const { isLoading: authLoading, isAuthenticated } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      router.push('/');
    }
  }, [authLoading, isAuthenticated, router]);

  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[var(--color-background)]">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-[var(--color-border)] border-t-[var(--color-primary)]"></div>
      </div>
    );
  }

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const redirectUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3001'}/api/auth/callback`;

      const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
        },
      });

      if (oauthError) {
        setError(oauthError.message || '로그인 실패');
        setIsLoading(false);
        return;
      }

      if (data?.url) {
        window.location.href = data.url;
      } else {
        setError('로그인 URL 생성 실패');
        setIsLoading(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '로그인 중 오류 발생');
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen items-center justify-center bg-[var(--color-background)] px-4">
      <div className="w-full max-w-md bg-[var(--color-card)] border border-[var(--color-border)] rounded-lg p-8 shadow-lg">
        {/* 헤더 */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-4 flex items-center justify-center">
            {/* 프리즘 필터 로고 - 실제 로고 파일 사용 */}
            <img
              src="/prism-filter-logo.svg"
              alt="PRISM FILTER"
              className="prism-logo w-20 h-20"
            />
          </div>
          <h1 className="text-2xl font-bold text-[var(--color-foreground)] mb-2">PRISM FILTER</h1>
          <p className="text-[var(--color-muted-foreground)]">정산 자동화 시스템</p>
        </div>

        {/* 안내 */}
        <div className="bg-blue-500/10 border border-blue-500 rounded-lg p-3 mb-4">
          <p className="text-sm text-[var(--color-foreground)]">
            <strong>회사 계정(@prism-filter.com)</strong>만 접근 가능합니다.
          </p>
        </div>

        {/* 오류 */}
        {error && (
          <div className="bg-red-500/10 border border-red-500 rounded-lg p-3 mb-4">
            <p className="text-sm text-red-400">
              <strong>❌ 오류:</strong> {error}
            </p>
          </div>
        )}

        {/* Google 로그인 버튼 */}
        <button
          onClick={handleGoogleLogin}
          disabled={isLoading}
          className="w-full h-10 bg-blue-600 hover:bg-blue-700 border border-blue-700 rounded-lg text-white font-medium flex items-center justify-center gap-2 transition-all disabled:opacity-50"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="currentColor"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="currentColor"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="currentColor"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          {isLoading ? '로그인 중...' : 'Google 계정으로 로그인'}
        </button>

        {/* 주의사항 */}
        <div className="text-center pt-6 border-t border-[var(--color-border)] mt-6">
          <p className="text-xs text-[var(--color-muted-foreground)] leading-relaxed">
            <span className="block font-semibold text-[var(--color-foreground)] mb-1">프리즘필터 뮤직그룹</span>
            직원만 로그인할 수 있습니다.
            <br />
            (@prism-filter.com 이메일 필수)
          </p>
        </div>
      </div>
    </div>
  );
}
