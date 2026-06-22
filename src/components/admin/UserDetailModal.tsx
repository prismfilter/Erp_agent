'use client';

// [정보확인] 프로필 모달 — 관리자가 사용자의 프로필 정보를 본다(읽기전용).
import type { ReactNode } from 'react';
import type { AdminUser } from '@/lib/admin/userMerge';
import type { UserRole } from '@/types';
import { RoleLabel } from '@/lib/ui/roleMeta';

function providerText(p: string | null): string {
  if (!p) return '-';
  if (p === 'google') return '구글';
  return p;
}

function fmtDate(s: string | null): string {
  return s ? new Date(s).toLocaleDateString('ko-KR') : '-';
}

function fmtDateTime(s: string | null): string {
  return s ? new Date(s).toLocaleString('ko-KR') : '-';
}

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-2 border-b border-border/60 last:border-0">
      <span className="text-xs text-muted-foreground flex-shrink-0">{label}</span>
      <span className="text-sm text-foreground text-right break-all">{value}</span>
    </div>
  );
}

export function UserDetailModal({ user, onClose }: { user: AdminUser; onClose: () => void }) {
  const initial = (user.name ?? user.email ?? '?').charAt(0).toUpperCase();
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="bg-card border border-border rounded-xl shadow-xl w-[420px] max-w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더: 아바타 + 이름 + 이메일 */}
        <div className="flex items-center gap-3 mb-5">
          {user.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.avatar_url} alt="" className="w-12 h-12 rounded-full object-cover" />
          ) : (
            <div className="w-12 h-12 rounded-full bg-primary/20 text-primary flex items-center justify-center text-lg font-bold">
              {initial}
            </div>
          )}
          <div className="min-w-0">
            <p className="text-base font-semibold text-foreground truncate">{user.name ?? '미등록'}</p>
            <p className="text-xs text-muted-foreground truncate">{user.email ?? '-'}</p>
          </div>
        </div>

        {/* 상세 필드 */}
        <div>
          <Row label="역할" value={<RoleLabel role={user.role as UserRole | null} />} />
          <Row label="이메일" value={user.email ?? '-'} />
          <Row label="사용자 ID" value={<span className="font-mono text-xs">{user.user_id}</span>} />
          <Row label="가입일" value={fmtDate(user.created_at)} />
          <Row label="계약일" value={fmtDate(user.contract_date)} />
          <Row label="마지막 로그인" value={fmtDateTime(user.last_sign_in_at)} />
          <Row label="로그인 방식" value={providerText(user.provider)} />
        </div>

        <button
          onClick={onClose}
          className="mt-6 w-full px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition cursor-pointer"
        >
          닫기
        </button>
      </div>
    </div>
  );
}
