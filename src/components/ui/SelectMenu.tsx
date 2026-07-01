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
  triggerClassName?: string; // 트리거 스킨(패딩·모서리·배경) 커스텀 — 미지정 시 기본 스킨
  title?: string;
}

// 기본 트리거 스킨 — 미지정 시 사용(기존 사용처 호환)
const DEFAULT_TRIGGER_SKIN =
  'px-3 py-2 rounded-lg text-foreground border border-border bg-background hover:border-primary';

export function SelectMenu({
  value,
  onChange,
  options,
  placeholder = '선택',
  className = '',
  triggerClassName,
  title,
}: SelectMenuProps) {
  const current = options.find((o) => o.value === value);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        title={title}
        className={`inline-flex items-center justify-between gap-1.5 text-sm transition cursor-pointer ${triggerClassName ?? DEFAULT_TRIGGER_SKIN} ${className}`}
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
              // base-ui의 RadioItem은 closeOnClick 기본값이 false(선택해도 메뉴 유지)라
              // 일반 select처럼 선택 즉시 닫히게 명시적으로 true를 준다.
              closeOnClick
              // 기본 아이템은 좌우 비대칭 패딩(pl-1.5 pr-8, 우측 체크 아이콘 공간)이라
              // justify-center만으로는 박스가 비대칭이라 텍스트가 왼쪽으로 치우쳐 보인다.
              // px-6로 좌우 동일하게 덮어써 실제로 가운데 정렬되게 한다.
              className="text-foreground cursor-pointer justify-center whitespace-nowrap px-6 text-center"
            >
              {o.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
