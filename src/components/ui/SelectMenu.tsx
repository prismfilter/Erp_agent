'use client';

// 커스텀 선택창 — 네이티브 <select> 대체. base-ui DropdownMenu 라디오 패턴(RoleSelect와 동일 톤).
// 스크롤이 생기는 긴 목록에는 gradient-scroll 적용. 항목/선택값은 가운데 정렬.

import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from '@/components/ui/dropdown-menu';

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectMenuProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  className?: string; // 트리거 추가 클래스(폭 등)
  title?: string;
}

export function SelectMenu({
  value,
  onChange,
  options,
  placeholder = '선택',
  className = '',
  title,
}: SelectMenuProps) {
  const current = options.find((o) => o.value === value);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        title={title}
        className={`inline-flex items-center justify-between gap-1.5 px-3 py-2 rounded-lg text-sm text-foreground border border-border bg-background hover:border-primary transition cursor-pointer ${className}`}
      >
        <span className="flex-1 text-center truncate">{current ? current.label : placeholder}</span>
        <span className="text-[10px] opacity-70 flex-none" aria-hidden="true">▾</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="center"
        className="min-w-[9rem] max-h-64 overflow-y-auto gradient-scroll bg-card border border-border"
      >
        <DropdownMenuRadioGroup value={value} onValueChange={(v) => onChange(String(v))}>
          {options.map((o) => (
            <DropdownMenuRadioItem
              key={o.value}
              value={o.value}
              className="text-foreground cursor-pointer justify-center"
            >
              {o.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
