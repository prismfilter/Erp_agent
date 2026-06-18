'use client';

// 역할 선택 — 블록 클릭 시 세로 드롭다운(직접 입력 불가, 라디오 선택만).
// WriterTypeSelect와 동일한 base-ui DropdownMenu 패턴. 트리거는 테마 그라디언트 블록.
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from '@/components/ui/dropdown-menu';
import { ROLE_META } from '@/lib/ui/roleMeta';

export type AccountRole = 'ADMIN' | 'STAFF' | 'EXCLUSIVE_WRITER' | 'GENERAL_WRITER';

const ROLE_ORDER: AccountRole[] = ['ADMIN', 'STAFF', 'EXCLUSIVE_WRITER', 'GENERAL_WRITER'];

export function RoleSelect({
  value,
  disabled,
  onChange,
}: {
  value: AccountRole | null;
  disabled?: boolean;
  onChange: (role: AccountRole) => void;
}) {
  const current = value ? ROLE_META[value] : null;
  const CurrentIcon = current?.Icon;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={disabled}
        title="역할 변경"
        className="inline-flex items-center justify-center gap-1.5 min-w-[7.5rem] px-3 py-1.5 rounded-lg text-sm text-foreground border border-primary/30 bg-gradient-to-br from-primary/25 via-primary/10 to-transparent hover:border-primary transition cursor-pointer disabled:opacity-50"
      >
        {CurrentIcon && <CurrentIcon className={`w-4 h-4 ${current?.color ?? ''}`} />}
        {current ? current.label : '미지정'}
        <span className="text-[10px] opacity-70" aria-hidden="true">▾</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center" className="min-w-[8rem] bg-card border border-border">
        <DropdownMenuRadioGroup value={value ?? ''} onValueChange={(v) => onChange(String(v) as AccountRole)}>
          {ROLE_ORDER.map((role) => {
            const { Icon, label, color } = ROLE_META[role];
            return (
              <DropdownMenuRadioItem key={role} value={role} className="text-foreground cursor-pointer gap-2">
                <Icon className={`w-4 h-4 ${color}`} /> {label}
              </DropdownMenuRadioItem>
            );
          })}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
