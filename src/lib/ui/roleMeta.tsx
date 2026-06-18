// 역할/작가 구분 아이콘·라벨 공용 정의 — 여러 페이지의 이모지 라벨 중복을 단일화.
// lucide 아이콘은 color=currentColor라 부모 텍스트색을 상속(라이트/다크/CLASSIC 다크 자동 적응).

import { Crown, Briefcase, PenLine, Pencil, type LucideIcon } from 'lucide-react';
import type { UserRole } from '@/types';

export interface RoleMeta {
  label: string;
  Icon: LucideIcon;
  // 아이콘 색상(Tailwind) — 라이트/다크/CLASSIC 다크에서 모두 읽히는 중간톤으로 선정
  color: string;
}

// 역할 → 라벨·아이콘·색상 (단일 진실원천)
export const ROLE_META: Record<UserRole, RoleMeta> = {
  ADMIN: { label: '관리자', Icon: Crown, color: 'text-amber-500' },
  STAFF: { label: '직원', Icon: Briefcase, color: 'text-sky-500' },
  EXCLUSIVE_WRITER: { label: '전속 작가', Icon: PenLine, color: 'text-violet-500' },
  GENERAL_WRITER: { label: '일반 작가', Icon: Pencil, color: 'text-emerald-500' },
};

// 역할 라벨(아이콘 + 텍스트). null/미지정은 '미지정' 텍스트만.
export function RoleLabel({ role, className }: { role: UserRole | null | undefined; className?: string }) {
  const meta = role ? ROLE_META[role] : null;
  if (!meta) return <span className={className}>미지정</span>;
  const { Icon, label, color } = meta;
  return (
    <span className={`inline-flex items-center gap-1 ${className ?? ''}`}>
      <Icon className={`w-3.5 h-3.5 shrink-0 ${color}`} aria-hidden="true" />
      {label}
    </span>
  );
}

// 작가 구분(전속작가/일반작가) — 작가 마스터 표기(역할과 라벨이 다름)
export const WRITER_TYPE_META: Record<string, RoleMeta> = {
  전속작가: { label: '전속작가', Icon: PenLine, color: 'text-violet-500' },
  일반작가: { label: '일반작가', Icon: Pencil, color: 'text-emerald-500' },
};
