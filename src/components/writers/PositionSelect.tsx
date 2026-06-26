'use client';

// 작가 포지션 다중 선택 — A(작사)/C(작곡)/AR(편곡) 체크박스 드롭다운.
// 선택 없음 = (미정). shadcn DropdownMenu 체크박스 아이템 사용.

import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu';
import {
  POSITION_OPTIONS,
  POSITION_LABELS,
  formatPositionCodes,
  type PositionCode,
} from '@/lib/writers/position';

export function PositionSelect({
  value,
  onChange,
  editable = true,
  triggerClassName,
}: {
  value: string[];
  onChange: (next: PositionCode[]) => void;
  editable?: boolean;
  triggerClassName?: string;
}) {
  // 읽기전용: 표시만(코드 A/C/AR)
  if (!editable) {
    return <span className="text-sm text-foreground">{formatPositionCodes(value)}</span>;
  }

  // 체크 토글 — 옵션 순서(A·C·AR)로 정규화해 onChange 전달
  const toggle = (code: PositionCode, checked: boolean) => {
    const set = new Set(
      value.filter((v): v is PositionCode =>
        (POSITION_OPTIONS as readonly string[]).includes(v)
      )
    );
    if (checked) set.add(code);
    else set.delete(code);
    onChange(POSITION_OPTIONS.filter((c) => set.has(c)));
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        title="포지션 선택"
        className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-foreground text-sm border border-border hover:border-primary transition cursor-pointer ${triggerClassName ?? ''}`}
      >
        {formatPositionCodes(value)}
        <span className="text-[10px] opacity-70" aria-hidden="true">▾</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center" className="min-w-36 bg-card border border-border">
        {POSITION_OPTIONS.map((code) => (
          <DropdownMenuCheckboxItem
            key={code}
            checked={value.includes(code)}
            onCheckedChange={(checked) => toggle(code, Boolean(checked))}
            className="text-foreground cursor-pointer"
          >
            {POSITION_LABELS[code]} ({code})
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
