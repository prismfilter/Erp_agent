'use client';

// 작가 상세 — 거래처 상세와 동일 양식. 섹션 카드(기본정보·저작물 요율·계약정보)를 세로 나열.
// 조회: ADMIN/STAFF · 수정: ADMIN only. 필드별 즉시 저장(PATCH /api/writers/[id]).

import { useEffect, useState, useCallback, useRef, type ReactNode } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Copy, Check } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useBreadcrumbStore } from '@/store/breadcrumbStore';
import type { Writer } from '@/types/invoice';
import { EditableField } from '@/components/clients/EditableField';
import {
  WriterTypeSelect,
  NullableRateCell,
  FeeRateCell,
  DateCell,
  ContractStatusCell,
} from '@/components/writers/WriterTable';
import { PositionSelect } from '@/components/writers/PositionSelect';
import { PlaylistLinks } from '@/components/writers/PlaylistLinks';
import { DatePicker } from '@/components/ui/DatePicker';
import { SelectMenu, type SelectOption } from '@/components/ui/SelectMenu';
import type { PositionCode } from '@/lib/writers/position';

// 섹션 카드 = 색 채운 제목 바 + 항목/내용 2열 표(거래처 상세와 동일).
function SectionCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="bg-card border border-border rounded-lg overflow-hidden shadow-sm">
      <div className="bg-primary/10 border-b border-border px-4 py-3 text-base font-bold text-foreground text-center">
        {title}
      </div>
      {children}
    </section>
  );
}

// 섹션 카드 내부의 항목/내용 표 (제목 바 아래). DetailRow들을 자식으로 받는다.
function SectionTableBody({ children }: { children: ReactNode }) {
  return (
    <table className="w-full text-sm">
      <tbody className="divide-y divide-border">{children}</tbody>
    </table>
  );
}

// 표 한 행: 항목(라벨) 셀 + 내용(값) 셀.
function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <tr>
      <th
        scope="row"
        className="w-40 bg-primary/5 px-4 py-3 text-sm font-medium text-muted-foreground text-center align-middle"
      >
        {label}
      </th>
      <td className="px-4 py-3 text-center align-middle">{children}</td>
    </tr>
  );
}

// 계약 기간 — 계약시작 ~ 계약종료 (재계약일 DateCell과 동일한 native date 톤). 변경 즉시 PATCH.
function ContractPeriodCell({
  start,
  end,
  editable,
  onSave,
}: {
  start: string | null;
  end: string | null;
  editable: boolean;
  onSave: (field: 'contract_start' | 'contract_end', v: string | null) => void;
}) {
  if (!editable) {
    const has = Boolean(start || end);
    return (
      <span className={has ? 'tabular-nums text-foreground' : 'text-muted-foreground text-xs'}>
        {has ? `${start ?? '…'} ~ ${end ?? '…'}` : '-'}
      </span>
    );
  }
  // 커스텀 DatePicker — 빈 값일 때 '계약시작'/'계약종료' placeholder, 텍스트 가운데 정렬.
  // 배경과 어우러지는 투명 박스 + 작은 글씨/블록(이전 native 입력칸 톤).
  // pl 작게 / pr 크게 → centerText 텍스트가 살짝 좌측으로(아이콘 공간 확보), 달력 아이콘은 우측 고정 → 시각적 중앙
  const triggerCls =
    'w-32 flex items-center pl-2 pr-7 py-1 text-xs bg-transparent border border-border rounded-md hover:border-primary transition cursor-pointer text-foreground';
  return (
    <div className="flex items-center justify-center gap-2">
      <DatePicker
        value={start ?? ''}
        onChange={(v) => onSave('contract_start', v || null)}
        maxDate={end ?? undefined}
        placeholder="계약시작"
        centerText
        className={triggerCls}
      />
      <span className="text-muted-foreground">~</span>
      <DatePicker
        value={end ?? ''}
        onChange={(v) => onSave('contract_end', v || null)}
        placeholder="계약종료"
        centerText
        className={triggerCls}
      />
    </div>
  );
}

// OP/SP 퍼블리셔 입력 셀 — 계약기간 날짜 블럭과 같은 투명 박스 양식(테두리·rounded·작은 패딩).
// 텍스트 크기는 재계약일 날짜 텍스트와 동일(text-sm). 클릭→입력, Enter/blur 저장, Esc 취소.
function PublisherCell({
  value,
  editable,
  placeholder,
  onSave,
}: {
  value: string | null;
  editable: boolean;
  placeholder: string;
  onSave: (v: string | null) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? '');

  if (!editable) {
    return value
      ? <span className="text-sm text-foreground">{value}</span>
      : <span className="text-muted-foreground text-xs">-</span>;
  }

  const boxCls =
    'w-32 px-2 py-1 text-sm text-center bg-transparent border border-border rounded-md hover:border-primary transition cursor-pointer';

  if (editing) {
    return (
      <input
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { onSave(draft.trim() || null); setEditing(false); }
          if (e.key === 'Escape') { setDraft(value ?? ''); setEditing(false); }
        }}
        onBlur={() => { onSave(draft.trim() || null); setEditing(false); }}
        placeholder={placeholder}
        maxLength={60}
        className={`${boxCls} outline-none text-foreground`}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => { setDraft(value ?? ''); setEditing(true); }}
      className={`${boxCls} ${value ? 'text-foreground' : 'text-muted-foreground'}`}
      title="클릭하여 수정"
    >
      {value || placeholder}
    </button>
  );
}

// 이메일 셀 — [id]@[도메인] 형식. 도메인은 커스텀 SelectMenu(직접입력/프리셋)에서 선택하거나
// '직접입력' 선택 시 도메인을 직접 타이핑. ADMIN만 편집, 등록된 이메일은 누구나 복사 가능.
// 조회(완성된 이메일 텍스트)와 편집(3분할 입력)을 분리 — 클릭으로 편집 진입, Enter 또는 바깥
// 클릭 시 저장하고 조회로 복귀. 편집 진입 시에만 입력칸이 마운트되므로 페이지 재방문 시
// 커서가 저절로 깜빡이는 문제(불필요한 autoFocus 마운트)도 함께 해소된다.
const EMAIL_CUSTOM = '__custom__';
const DOMAIN_OPTIONS: SelectOption[] = [
  { value: EMAIL_CUSTOM, label: '직접입력' },
  { value: 'prism-filter.com', label: 'prism-filter.com' },
  { value: 'gmail.com', label: 'gmail.com' },
  { value: 'naver.com', label: 'naver.com' },
  { value: 'daum.net', label: 'daum.net' },
];
const DOMAIN_PRESETS = DOMAIN_OPTIONS.filter((o) => o.value !== EMAIL_CUSTOM).map((o) => o.value);

// "id@domain" → 편집 상태 초기값(id·도메인 원문·SelectMenu 선택값)
function parseEmail(value: string | null) {
  const at = (value ?? '').indexOf('@');
  const id = at >= 0 ? (value ?? '').slice(0, at) : (value ?? '');
  const domain = at >= 0 ? (value ?? '').slice(at + 1) : '';
  const select = DOMAIN_PRESETS.includes(domain) ? domain : domain ? EMAIL_CUSTOM : '';
  return { id, domain, select };
}

// 기본적인 이메일 형식 검증(로컬파트@도메인.최상위도메인) — 관리자 입력 실수 방지용, RFC 완전 준수는 아님.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// 복사 버튼 — 다른 이메일 셀(components/admin/EmailCell.tsx)과 동일하게 텍스트에 마우스를
// 올렸을 때만 우측에 살짝 나타난다(group-hover). 클릭 시 클립보드 복사 + 체크 아이콘 피드백.
function CopyEmailButton({ email }: { email: string }) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        navigator.clipboard.writeText(email).then(() => {
          setCopied(true);
          if (timerRef.current) clearTimeout(timerRef.current);
          timerRef.current = setTimeout(() => setCopied(false), 1500);
        });
      }}
      className="absolute left-full top-1/2 -translate-y-1/2 ml-1 opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-foreground transition rounded hover:bg-primary/10 cursor-pointer"
      title="이메일 복사"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

function WriterEmailCell({
  value,
  editable,
  onSave,
}: {
  value: string | null;
  editable: boolean;
  onSave: (v: string | null) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [id, setId] = useState('');
  const [domainSelect, setDomainSelect] = useState('');
  const [customDomain, setCustomDomain] = useState('');
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const startEdit = () => {
    const p = parseEmail(value);
    setId(p.id);
    setDomainSelect(p.select);
    setCustomDomain(p.select === EMAIL_CUSTOM ? p.domain : '');
    setError(null);
    setEditing(true);
  };

  // 유효성 검사 후 저장:
  // - 아이디·도메인 둘 다 비면 → 등록 해제(null)
  // - 도메인만 있고 아이디가 없으면 → "아이디를 입력해주세요" (형식 오류와 구분되는 안내)
  // - 아이디는 있는데 조합이 이메일 형식에 안 맞으면(도메인 누락·오타 등) → 형식 오류 경고, 저장하지 않음
  const trySave = useCallback((curId: string, curDomain: string): boolean => {
    const i = curId.trim();
    const d = curDomain.trim();
    if (!i && !d) { setError(null); onSave(null); return true; }
    if (!i) { setError('아이디를 입력해주세요.'); return false; }
    const composed = `${i}@${d}`;
    if (!EMAIL_RE.test(composed)) {
      setError('이메일 형식이 올바르지 않습니다.');
      return false;
    }
    setError(null);
    onSave(composed);
    return true;
  }, [onSave]);

  // 편집 종료 — 직접입력을 선택해 놓고 도메인만 비워둔 채 아이디는 남아 있다면(도메인 입력만
  // 포기한 의도) 원래 도메인으로 되돌려 저장. 단, 아이디까지 함께 비웠다면(전체 삭제 의도)
  // 되돌리지 않고 그대로 진행해 완전히 등록 해제되도록 한다. 저장이 유효성 검사를 통과했을
  // 때만 조회 모드로 돌아간다(형식이 잘못되면 편집을 유지해 고칠 수 있게).
  const finishEdit = useCallback((curId: string, curDomainSelect: string, curCustomDomain: string) => {
    let domain = curDomainSelect === EMAIL_CUSTOM ? curCustomDomain : curDomainSelect;
    if (curDomainSelect === EMAIL_CUSTOM && !curCustomDomain.trim() && curId.trim()) {
      const original = parseEmail(value);
      domain = original.domain;
      setDomainSelect(original.select);
      setCustomDomain(original.select === EMAIL_CUSTOM ? original.domain : '');
    }
    if (trySave(curId, domain)) setEditing(false);
  }, [trySave, value]);

  // 바깥 클릭 시 편집 종료 — 도메인 드롭다운은 Portal로 렌더되고 항목 선택 시 base-ui가
  // 동기적으로 메뉴를 닫으며 DOM을 제거하므로, 클릭 시점의 target만으로 안/밖을 판단하면
  // 레이스가 생겨 편집이 즉시 닫히거나 메뉴가 어중간하게 남는다. 한 틱(setTimeout) 뒤
  // 실제 포커스 위치(document.activeElement)로 재확인해 이 경합을 없앤다.
  useEffect(() => {
    if (!editing) return;
    const handlePointerDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (containerRef.current?.contains(target)) return;
      setTimeout(() => {
        const active = document.activeElement;
        if (containerRef.current?.contains(active)) return; // 예: 새로 열린 직접입력 입력칸으로 포커스 이동
        if (active instanceof Element && active.closest('[data-slot="dropdown-menu-content"]')) return; // 드롭다운이 아직 열려 있음
        finishEdit(id, domainSelect, customDomain);
      }, 0);
    };
    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [editing, id, domainSelect, customDomain, finishEdit]);

  if (!editable) {
    return value ? (
      <span className="relative inline-block group">
        <span className="text-sm text-foreground break-all">{value}</span>
        <CopyEmailButton email={value} />
      </span>
    ) : (
      <span className="text-muted-foreground text-xs">-</span>
    );
  }

  if (!editing) {
    return value ? (
      <span className="relative inline-block group">
        <button
          type="button"
          onClick={startEdit}
          className="text-sm text-foreground hover:underline cursor-pointer"
          title="클릭하여 수정"
        >
          {value}
        </button>
        <CopyEmailButton email={value} />
      </span>
    ) : (
      <button
        type="button"
        onClick={startEdit}
        className="px-2 py-1 text-sm text-muted-foreground border border-border rounded-md hover:border-primary transition cursor-pointer"
      >
        이메일 등록
      </button>
    );
  }

  // OP/SP 셀과 동일 톤(투명 배경·py-1·text-sm·rounded-md). 도메인 select도 같은 스킨으로 통일.
  const boxCls =
    'px-2 py-1 text-sm text-center bg-transparent border border-border rounded-md hover:border-primary transition text-foreground outline-none';
  const domainTriggerSkin =
    'px-2 py-1 rounded-md text-foreground border border-border bg-transparent hover:border-primary';

  return (
    <div ref={containerRef} className="flex flex-col items-center gap-1">
      <div className="flex flex-wrap items-center justify-center gap-1.5">
        <input
          value={id}
          onChange={(e) => { setId(e.target.value); setError(null); }}
          onKeyDown={(e) => { if (e.key === 'Enter') finishEdit(id, domainSelect, customDomain); }}
          placeholder="아이디"
          maxLength={64}
          className={`${boxCls} w-28`}
        />
        <span className="text-muted-foreground">@</span>
        <SelectMenu
          value={domainSelect}
          onChange={(v) => {
            setDomainSelect(v);
            setError(null);
            if (v !== EMAIL_CUSTOM) trySave(id, v); // 프리셋 선택은 즉시 저장(편집 상태는 유지)
          }}
          options={DOMAIN_OPTIONS}
          placeholder="도메인"
          triggerClassName={domainTriggerSkin}
          className="w-40"
        />
        {domainSelect === EMAIL_CUSTOM && (
          <input
            autoFocus
            value={customDomain}
            onChange={(e) => { setCustomDomain(e.target.value); setError(null); }}
            onKeyDown={(e) => { if (e.key === 'Enter') finishEdit(id, domainSelect, customDomain); }}
            placeholder="도메인 직접입력"
            maxLength={64}
            className={`${boxCls} w-36`}
          />
        )}
      </div>
      {error && <p className="text-red-400 text-xs">{error}</p>}
    </div>
  );
}

export default function WriterDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN';

  const [writer, setWriter] = useState<Writer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWriter = useCallback(async () => {
    try {
      const res = await fetch(`/api/writers/${id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '작가를 불러올 수 없습니다.');
      setWriter(data.writer);
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- async fetch (마이크로태스크에서 setState)
  useEffect(() => { fetchWriter(); }, [fetchWriter]);

  // 브레드크럼에 작가명 표시 (언마운트 시 해제 → 경로 기반 라벨로 복귀)
  const setBreadcrumb = useBreadcrumbStore((s) => s.setOverride);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clear);
  useEffect(() => {
    if (writer?.name) setBreadcrumb(writer.name);
    return () => clearBreadcrumb();
  }, [writer?.name, setBreadcrumb, clearBreadcrumb]);

  // 단일 필드 PATCH — 비-text 컨트롤(구분·요율·날짜·상태·포지션)에서 사용
  const patchField = useCallback(async (field: keyof Writer, value: Writer[keyof Writer]) => {
    const res = await fetch(`/api/writers/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: value }),
    });
    if (res.ok) {
      const updated = (await res.json()).writer as Writer;
      setWriter(updated);
    }
  }, [id]);

  // EditableField(텍스트) 저장 성공 시 로컬 상태만 갱신(PATCH는 EditableField가 자체 수행)
  const handleSaved = useCallback((field: string, value: string | null) => {
    setWriter((prev) => (prev ? { ...prev, [field]: value } : prev));
  }, []);

  if (isLoading) {
    return (
      <div className="p-12 text-center">
        <div className="animate-spin rounded-full h-6 w-6 border-2 border-border border-t-primary mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">데이터 로딩 중...</p>
      </div>
    );
  }
  if (error || !writer) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => router.push('/admin/writers')}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" /> 작가 마스터
        </button>
        <div className="p-8 text-center"><p className="text-red-400">오류: {error ?? '작가를 찾을 수 없습니다.'}</p></div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto pb-10">
      {/* 헤더: 뒤로가기 + 코드·작가명 (하단 구분선으로 표 영역과 분리) */}
      <div className="space-y-3 pb-6 border-b border-border">
        <button
          onClick={() => router.push('/admin/writers')}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" /> 작가 마스터
        </button>
        <div className="flex items-center justify-center gap-3">
          <span className="font-mono text-sm tabular-nums text-muted-foreground">{writer.writer_code}</span>
          <h1 className="text-2xl font-bold text-foreground">{writer.name}</h1>
        </div>
      </div>

      {/* 섹션 나열 — 각 섹션은 색 채운 제목 바 + 표 카드 */}
      <div className="mt-12 space-y-10">
        {/* 기본정보 */}
        <SectionCard title="기본정보">
          <SectionTableBody>
            <DetailRow label="작가 코드">
              <span className="font-mono tabular-nums text-foreground">{writer.writer_code}</span>
            </DetailRow>
            <DetailRow label="작가명">
              <EditableField apiPath={`/api/writers/${id}`} field="name" label="작가명" value={writer.name} editable={isAdmin} onSaved={handleSaved} />
            </DetailRow>
            <DetailRow label="구분">
              <div className="flex justify-center">
                <WriterTypeSelect value={writer.writer_type} onChange={(v) => { patchField('writer_type', v); }} />
              </div>
            </DetailRow>
            <DetailRow label="영문명">
              <EditableField apiPath={`/api/writers/${id}`} field="english_name" label="영문명" value={writer.english_name ?? null} editable={isAdmin} onSaved={handleSaved} />
            </DetailRow>
            <DetailRow label="활동명">
              <EditableField apiPath={`/api/writers/${id}`} field="stage_name" label="활동명" value={writer.stage_name ?? null} editable={isAdmin} onSaved={handleSaved} />
            </DetailRow>
            <DetailRow label="활동명(EN)">
              <EditableField apiPath={`/api/writers/${id}`} field="stage_name_en" label="활동명(EN)" value={writer.stage_name_en ?? null} editable={isAdmin} onSaved={handleSaved} />
            </DetailRow>
            <DetailRow label="원작자 코드">
              <EditableField apiPath={`/api/writers/${id}`} field="original_writer_code" label="원작자 코드" value={writer.original_writer_code ?? null} editable={isAdmin} onSaved={handleSaved} />
            </DetailRow>
            <DetailRow label="이메일">
              <WriterEmailCell value={writer.email} editable={isAdmin} onSave={(v) => { patchField('email', v); }} />
            </DetailRow>
            <DetailRow label="URL">
              <PlaylistLinks
                urls={writer.playlist_urls ?? []}
                editable={isAdmin}
                onChange={(next) => { patchField('playlist_urls', next); }}
              />
            </DetailRow>
            <DetailRow label="등록일">
              <span className="text-foreground">
                {writer.created_at ? new Date(writer.created_at).toLocaleDateString('ko-KR') : '-'}
              </span>
            </DetailRow>
          </SectionTableBody>
        </SectionCard>

        {/* 저작물 요율 */}
        <SectionCard title="저작물 요율">
          <SectionTableBody>
            <DetailRow label="영구 저작물(%)">
              <NullableRateCell value={writer.permanent_rate} editable={isAdmin} onSave={(v) => patchField('permanent_rate', v)} />
            </DetailRow>
            <DetailRow label="일반 저작물(%)">
              <NullableRateCell value={writer.general_rate} editable={isAdmin} onSave={(v) => patchField('general_rate', v)} />
            </DetailRow>
            <DetailRow label="용역 요율(%)">
              <FeeRateCell value={writer.fee_rate} editable={isAdmin} onSave={(v) => patchField('fee_rate', v)} />
            </DetailRow>
          </SectionTableBody>
        </SectionCard>

        {/* 계약정보 */}
        <SectionCard title="계약정보">
          <SectionTableBody>
            <DetailRow label="계약기간">
              <ContractPeriodCell
                start={writer.contract_start}
                end={writer.contract_end}
                editable={isAdmin}
                onSave={(field, v) => { patchField(field, v); }}
              />
            </DetailRow>
            <DetailRow label="재계약일">
              <DateCell value={writer.recontract_date} editable={isAdmin} onSave={(v) => patchField('recontract_date', v)} />
            </DetailRow>
            <DetailRow label="OP / SP">
              <div className="flex items-center justify-center gap-2">
                <PublisherCell value={writer.op} editable={isAdmin} placeholder="OP 등록" onSave={(v) => { patchField('op', v); }} />
                <span className="text-muted-foreground">/</span>
                <PublisherCell value={writer.sp} editable={isAdmin} placeholder="SP 등록" onSave={(v) => { patchField('sp', v); }} />
              </div>
            </DetailRow>
            <DetailRow label="계약 상태">
              <ContractStatusCell value={writer.status} editable={isAdmin} onSave={(v) => patchField('status', v)} />
            </DetailRow>
            <DetailRow label="포지션">
              <div className="flex justify-center">
                <PositionSelect value={writer.position ?? []} editable={isAdmin} onChange={(next: PositionCode[]) => { patchField('position', next); }} />
              </div>
            </DetailRow>
          </SectionTableBody>
        </SectionCard>
      </div>
    </div>
  );
}
