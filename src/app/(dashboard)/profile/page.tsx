'use client';

import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';

export default function ProfilePage() {
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">로그인 정보를 불러올 수 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">
          내 프로필 설정
        </h1>
        <p className="text-muted-foreground">
          2026년 06월 09일 • 계정 정보 및 설정
        </p>
      </div>

      {/* 프로필 정보 */}
      <div className="bg-card border border-border rounded-lg p-6">
        <h2 className="text-xl font-bold text-foreground mb-4">
          계정 정보
        </h2>

        <div className="space-y-4">
          {/* 이메일 */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase">
              이메일
            </label>
            <p className="text-foreground mt-1">{user.email}</p>
          </div>

          {/* 역할 */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase">
              역할
            </label>
            <p className="text-foreground mt-1">
              {user.role === 'ADMIN' && '👑 관리자'}
              {user.role === 'STAFF' && '💼 직원'}
              {user.role === 'WRITER' && '✍️ 작가'}
              {!['ADMIN', 'STAFF', 'WRITER'].includes(user.role || '') && '사용자'}
            </p>
          </div>

          {/* 사용자 ID */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase">
              사용자 ID
            </label>
            <p className="text-foreground mt-1 font-mono text-sm">
              {user.id || '정보 없음'}
            </p>
          </div>
        </div>
      </div>

      {/* 보안 설정 */}
      <div className="bg-card border border-border rounded-lg p-6">
        <h2 className="text-xl font-bold text-foreground mb-4">
          보안
        </h2>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            비밀번호 변경 및 보안 설정은 개발 중입니다.
          </p>
        </div>
      </div>

      {/* 뒤로가기 */}
      <div className="flex gap-3">
        <Link
          href="/"
          className="px-4 py-2 bg-[var(--color-border)] hover:bg-[var(--color-border)]/80 text-foreground rounded-lg text-sm font-medium transition"
        >
          ← 뒤로가기
        </Link>
      </div>
    </div>
  );
}
