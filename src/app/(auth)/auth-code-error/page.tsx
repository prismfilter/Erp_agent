import Link from 'next/link';
import { PrismFilterLogo } from '@/components/logo';
import { ALLOWED_EMAIL_DOMAIN } from '@/lib/auth/domain';

export default async function AuthCodeErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  const { reason } = await searchParams;
  const isDomain = reason === 'domain';

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4">
      <div className="bg-white rounded-lg shadow-2xl p-8 w-full max-w-md text-center">
        <div className="mb-6 flex justify-center">
          <PrismFilterLogo size={56} />
        </div>

        <h1 className="text-2xl font-bold text-red-600 mb-4">
          {isDomain ? '접근 권한 없음' : '로그인 실패'}
        </h1>
        <p className="text-gray-600 mb-6">
          {isDomain
            ? `회사 계정(@${ALLOWED_EMAIL_DOMAIN})으로만 로그인할 수 있습니다.`
            : '인증 과정 중 오류가 발생했습니다. 다시 시도해주세요.'}
        </p>

        <Link
          href="/login"
          className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
        >
          다시 로그인하기
        </Link>
      </div>
    </div>
  );
}
