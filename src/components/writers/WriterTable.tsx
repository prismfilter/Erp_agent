'use client';

// 작가 마스터 테이블 재사용 컴포넌트
// WriterMasterPage(page.tsx)에서 셀 컴포넌트·표 렌더를 추출 — 탭별 섹션에서 재사용

import { useState } from 'react';
import Link from 'next/link';
import { Eye, Pencil } from 'lucide-react';
import type { Writer } from '@/types/invoice';
import { WRITER_TYPE_META } from '@/lib/ui/roleMeta';
import { SortableHeader } from '@/components/ui/SortableHeader';
import { NumberInput } from '@/components/ui/NumberInput';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from '@/components/ui/dropdown-menu';

// 작가 구분(전속/일반) 상수·타입 — 등록 폼·상세 페이지·탭에서 공용
export const WRITER_TYPES = ['전속작가', '일반작가'] as const;
export type WriterType = (typeof WRITER_TYPES)[number];

// 작가 구분 배지(아이콘 + 텍스트). lucide currentColor로 테마 적응.
// WriterTypeSelect도 참조하므로 export
export function typeBadge(type: string) {
  const meta = WRITER_TYPE_META[type];
  const Icon = meta?.Icon ?? Pencil;
  return (
    <span className="inline-flex items-center gap-1">
      <Icon className={`w-3.5 h-3.5 shrink-0 ${meta?.color ?? 'text-emerald-500'}`} />
      {meta?.label ?? type}
    </span>
  );
}

// 구분(전속/일반) 선택 — 테마 그라데이션과 어울리는 커스텀 드롭다운(검은 native select 대체)
export function WriterTypeSelect({
  value,
  onChange,
  triggerClassName,
}: {
  value: string;
  onChange: (v: WriterType) => void;
  triggerClassName?: string;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        title="구분 변경"
        className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-foreground text-sm border border-border hover:border-primary transition cursor-pointer ${triggerClassName ?? ''}`}
      >
        {typeBadge(value)}
        <span className="text-[10px] opacity-70" aria-hidden="true">▾</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center" className="min-w-36 bg-card border border-border">
        <DropdownMenuRadioGroup value={value} onValueChange={(v) => onChange(String(v) as WriterType)}>
          {WRITER_TYPES.map((t) => (
            <DropdownMenuRadioItem key={t} value={t} className="text-foreground cursor-pointer">
              {typeBadge(t)}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// 텍스트 인라인 편집 셀 (작가명)
export function NameCell({
  value,
  editable,
  onSave,
}: {
  value: string;
  editable: boolean;
  onSave: (v: string) => Promise<void>;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!draft.trim()) { setIsEditing(false); setDraft(value); return; }
    setSaving(true);
    try {
      await onSave(draft.trim());
      setIsEditing(false);
    } finally {
      setSaving(false);
    }
  };

  if (!editable) return <span className="text-foreground">{value}</span>;

  if (isEditing) {
    return (
      <input
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleSave();
          if (e.key === 'Escape') { setDraft(value); setIsEditing(false); }
        }}
        onBlur={handleSave}
        autoFocus
        disabled={saving}
        className="w-28 px-2 py-1 text-xs text-center bg-background border border-primary rounded outline-none text-foreground"
      />
    );
  }

  // 값을 셀 정중앙에 두고, hover 시 값 오른쪽 끝에 연필 아이콘을 절대배치로 노출(EditableField 패턴).
  // 절대배치는 폭 계산에서 제외되어 값이 정확히 가운데 오고, 아이콘은 값에 붙어 함께 이동.
  return (
    <span className="relative inline-block group">
      <span className="text-foreground">{value}</span>
      <span className="absolute left-full top-1/2 -translate-y-1/2 ml-1 flex items-center opacity-0 group-hover:opacity-100 transition">
        <button
          type="button"
          onClick={() => { setDraft(value); setIsEditing(true); }}
          className="p-1 text-muted-foreground hover:text-foreground transition rounded hover:bg-primary/10 cursor-pointer"
          title="이름 수정"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
          </svg>
        </button>
      </span>
    </span>
  );
}

// 용역 요율(%) 인라인 편집 셀
export function FeeRateCell({
  value,
  editable,
  onSave,
}: {
  value: number;
  editable: boolean;
  onSave: (v: number) => Promise<void>;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const num = Math.min(100, Math.max(0, Number(draft) || 0));
    setSaving(true);
    try {
      await onSave(num);
      setIsEditing(false);
    } finally {
      setSaving(false);
    }
  };

  // 용역 요율 0%는 미설정으로 보고 재계약일처럼 '-'(muted)로 표시
  if (!editable) {
    return value === 0
      ? <span className="text-muted-foreground text-xs">-</span>
      : <span className="tabular-nums text-foreground">{value}%</span>;
  }

  if (isEditing) {
    return (
      <NumberInput
        size="sm"
        min={0}
        max={100}
        value={draft}
        onChange={(v) => setDraft(v)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleSave();
          if (e.key === 'Escape') { setDraft(String(value)); setIsEditing(false); }
        }}
        onBlur={handleSave}
        autoFocus
        disabled={saving}
        className="w-24 mx-auto"
      />
    );
  }

  return (
    <button
      onClick={() => { setDraft(String(value)); setIsEditing(true); }}
      className={`w-24 mx-auto min-h-[2rem] flex items-center justify-center text-xs tabular-nums border border-transparent rounded-lg hover:border-border hover:bg-muted/40 transition cursor-pointer ${value === 0 ? 'text-muted-foreground' : 'text-foreground'}`}
      title="클릭하여 수정"
    >
      {value === 0 ? '-' : `${value}%`}
    </button>
  );
}

// 저작물 요율(%) 인라인 편집 셀 — null이면 '미지정', 입력을 비우면 미지정으로 저장
export function NullableRateCell({
  value,
  editable,
  onSave,
}: {
  value: number | null;
  editable: boolean;
  onSave: (v: number | null) => Promise<void>;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(value == null ? '' : String(value));
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const next = draft.trim() === '' ? null : Math.min(100, Math.max(0, Number(draft) || 0));
    setSaving(true);
    try {
      await onSave(next);
      setIsEditing(false);
    } finally {
      setSaving(false);
    }
  };

  if (!editable) {
    return value == null
      ? <span className="text-muted-foreground text-xs">-</span>
      : <span className="tabular-nums text-foreground">{value}%</span>;
  }

  if (isEditing) {
    return (
      <NumberInput
        size="sm"
        min={0}
        max={100}
        value={draft}
        onChange={(v) => setDraft(v)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleSave();
          if (e.key === 'Escape') { setDraft(value == null ? '' : String(value)); setIsEditing(false); }
        }}
        onBlur={handleSave}
        autoFocus
        disabled={saving}
        placeholder="미지정"
        className="w-24 mx-auto"
      />
    );
  }

  return (
    <button
      onClick={() => { setDraft(value == null ? '' : String(value)); setIsEditing(true); }}
      className={`w-24 mx-auto min-h-[2rem] flex items-center justify-center border border-transparent rounded-lg hover:border-border hover:bg-muted/40 transition cursor-pointer ${value == null ? 'text-muted-foreground text-xs' : 'tabular-nums text-foreground'}`}
      title="클릭하여 수정 (비우면 미지정)"
    >
      {value == null ? '-' : `${value}%`}
    </button>
  );
}

// 재계약일 인라인 편집 셀(날짜) — null이면 '-', 클릭→date 입력, 비우면 미지정(null)로 저장
export function DateCell({
  value,
  editable,
  onSave,
}: {
  value: string | null;
  editable: boolean;
  onSave: (v: string | null) => Promise<void>;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(draft.trim() === '' ? null : draft);
      setIsEditing(false);
    } finally {
      setSaving(false);
    }
  };

  if (!editable) {
    return <span className={value ? 'tabular-nums text-foreground' : 'text-muted-foreground text-xs'}>{value ?? '-'}</span>;
  }

  if (isEditing) {
    return (
      <input
        type="date"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleSave();
          if (e.key === 'Escape') { setDraft(value ?? ''); setIsEditing(false); }
        }}
        onBlur={handleSave}
        autoFocus
        disabled={saving}
        // bg-transparent: 수정 중·blur 시 검은 블럭 대신 배경색과 어우러지게
        className="w-full max-w-[150px] px-2 py-1 text-xs text-center bg-transparent border border-primary rounded outline-none text-foreground tabular-nums"
      />
    );
  }

  return (
    <button
      onClick={() => { setDraft(value ?? ''); setIsEditing(true); }}
      className={`transition cursor-pointer hover:text-primary ${value ? 'tabular-nums text-foreground' : 'text-muted-foreground text-xs'}`}
      title="클릭하여 수정 (비우면 미지정)"
    >
      {value ?? '-'}
    </button>
  );
}

// 계약 상태 토글 셀 — active=활성화(초록)/terminated=해지(빨강). ADMIN만 변경.
export function ContractStatusCell({
  value,
  editable,
  onSave,
}: {
  value: string;
  editable: boolean;
  onSave: (v: 'active' | 'terminated') => Promise<void>;
}) {
  const isActive = value !== 'terminated';

  if (!editable) {
    return (
      <span
        className={`inline-block px-3 py-1 rounded-md text-xs font-medium ${
          isActive ? 'bg-green-500/15 text-green-500' : 'bg-red-500/15 text-red-400'
        }`}
      >
        {isActive ? '활성화' : '해지'}
      </span>
    );
  }

  // 단일 토글: 현재 상태 버튼을 누르면 반대 상태로 전환(활성화↔해지)
  return (
    <button
      type="button"
      onClick={() => onSave(isActive ? 'terminated' : 'active')}
      title={isActive ? '클릭하면 계약 해지' : '클릭하면 활성화'}
      className={`inline-block px-3 py-1 rounded-md text-xs font-medium transition cursor-pointer ${
        isActive
          ? 'bg-green-500/20 text-green-500 hover:bg-green-500/30'
          : 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
      }`}
    >
      {isActive ? '활성화' : '해지'}
    </button>
  );
}

// 작가 마스터 테이블 — 탭별 섹션(전속/일반/해지)에서 재사용
export function WriterTable({
  title,
  writers,
  isAdmin,
  sortKey,
  dir,
  toggle,
  onPatch,
  onDelete,
  focusId,
}: {
  title: string;
  writers: Writer[];
  isAdmin: boolean;
  sortKey: string | null;
  dir: 'asc' | 'desc';
  toggle: (key: string) => void;
  onPatch: (id: string, patch: Partial<Writer>) => Promise<void>;
  onDelete: (id: string) => void;
  focusId?: string | null;
}) {
  // 삭제 확인 상태 — 각 WriterTable 인스턴스가 독립적으로 관리
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  // 섹션 제목 바 — 카드 상단에 색 채운 제목(용역 단가표 패턴)
  const titleBar = (
    <div className="px-4 py-3 border-b border-border bg-primary/5">
      <h2 className="text-sm font-bold text-foreground text-center">{title}</h2>
    </div>
  );

  if (writers.length === 0) {
    return (
      <div className="bg-card border border-border rounded-lg overflow-hidden w-full max-w-7xl mx-auto">
        {titleBar}
        <div className="p-8 text-center">
          <p className="text-muted-foreground">등록된 작가가 없습니다.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden w-full max-w-7xl mx-auto">
      {titleBar}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-primary/10 border-b border-border">
            <tr>
              <SortableHeader label="작가 코드" sortKey="writer_code" activeKey={sortKey} dir={dir} onSort={toggle} align="center" className="px-6 py-2.5 text-xs uppercase" />
              <SortableHeader label="작가명" sortKey="name" activeKey={sortKey} dir={dir} onSort={toggle} align="center" className="px-6 py-2.5 text-xs uppercase" />
              <SortableHeader label="영구 저작물(%)" sortKey="permanent_rate" activeKey={sortKey} dir={dir} onSort={toggle} align="center" className="px-6 py-2.5 text-xs uppercase" />
              <SortableHeader label="일반 저작물(%)" sortKey="general_rate" activeKey={sortKey} dir={dir} onSort={toggle} align="center" className="px-6 py-2.5 text-xs uppercase" />
              <SortableHeader label="용역 요율(%)" sortKey="fee_rate" activeKey={sortKey} dir={dir} onSort={toggle} align="center" className="px-6 py-2.5 text-xs uppercase" />
              <SortableHeader label="재계약일" sortKey="recontract_date" activeKey={sortKey} dir={dir} onSort={toggle} align="center" className="px-6 py-2.5 text-xs uppercase" />
              {/* 정렬 불가 — 보기 버튼만 있는 열 */}
              <th className="px-6 py-2.5 text-center font-bold text-foreground text-xs uppercase">상세정보</th>
              <SortableHeader label="계약 상태" sortKey="status" activeKey={sortKey} dir={dir} onSort={toggle} align="center" className="px-6 py-2.5 text-xs uppercase" />
              {/* 정렬 불가 — 액션 열 */}
              {isAdmin && <th className="px-6 py-2.5 text-center font-bold text-foreground text-xs uppercase w-24">액션</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {writers.map((w) => (
              <tr
                key={w.id}
                id={`row-${w.id}`}
                className={`hover:bg-primary/5${focusId === w.id ? ' ring-1 ring-inset ring-primary/40' : ''}`}
              >
                <td className="px-6 py-2.5 text-center">
                  <span className="font-mono text-xs tabular-nums text-foreground">{w.writer_code}</span>
                </td>
                <td className="px-6 py-2.5 text-center">
                  <NameCell value={w.name} editable={isAdmin} onSave={(v) => onPatch(w.id, { name: v })} />
                </td>
                <td className="px-6 py-2.5 text-center">
                  <NullableRateCell value={w.permanent_rate} editable={isAdmin} onSave={(v) => onPatch(w.id, { permanent_rate: v })} />
                </td>
                <td className="px-6 py-2.5 text-center">
                  <NullableRateCell value={w.general_rate} editable={isAdmin} onSave={(v) => onPatch(w.id, { general_rate: v })} />
                </td>
                <td className="px-6 py-2.5 text-center">
                  <FeeRateCell value={w.fee_rate} editable={isAdmin} onSave={(v) => onPatch(w.id, { fee_rate: v })} />
                </td>
                <td className="px-6 py-2.5 text-center">
                  <DateCell value={w.recontract_date} editable={isAdmin} onSave={(v) => onPatch(w.id, { recontract_date: v })} />
                </td>
                <td className="px-6 py-2.5 text-center">
                  <Link
                    href={`/admin/writers/${w.id}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs border border-border rounded-lg text-foreground hover:bg-primary/10 hover:border-primary transition cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" /> 보기
                  </Link>
                </td>
                <td className="px-6 py-2.5 text-center">
                  <ContractStatusCell value={w.status} editable={isAdmin} onSave={(v) => onPatch(w.id, { status: v })} />
                </td>
                {isAdmin && (
                  <td className="px-6 py-2.5 text-center">
                    {confirmingId === w.id ? (
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => { onDelete(w.id); setConfirmingId(null); }}
                          className="px-2 py-1 rounded text-[11px] font-medium bg-red-500/20 text-red-400 hover:bg-red-500/30 transition cursor-pointer"
                        >
                          삭제
                        </button>
                        <button
                          onClick={() => setConfirmingId(null)}
                          className="px-2 py-1 rounded text-[11px] font-medium bg-gray-500/20 text-gray-400 hover:bg-gray-500/30 transition cursor-pointer"
                        >
                          취소
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmingId(w.id)}
                        className="p-1.5 text-muted-foreground hover:text-red-400 transition rounded hover:bg-red-500/10 cursor-pointer"
                        title="삭제"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/>
                        </svg>
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
