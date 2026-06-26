'use client';

// 저작물 작품 정보 + 원작자 다건 입력 폼 (등록/수정 공용)
// 등록(POST)·수정(PATCH) 페이지가 onSubmit만 달리해 재사용한다.
// clickToEdit=true(수정 모드): 값은 텍스트로 보이고 클릭 시에만 입력칸으로 전환된다.

import Link from 'next/link';
import { useState } from 'react';
import type { WorkAuthorRole } from '@/types/invoice';
import { NumberInput } from '@/components/ui/NumberInput';
import { DatePicker } from '@/components/ui/DatePicker';

// 포지션 옵션 (코드 표기). A=작사 / C=작곡 / AR=편곡
const ROLE_OPTIONS: { value: WorkAuthorRole; label: string }[] = [
  { value: 'A', label: 'A' },
  { value: 'C', label: 'C' },
  { value: 'AR', label: 'AR' },
];

// 폼 입력용 원작자 행(모두 문자열)
export interface AuthorRow {
  role: WorkAuthorRole | '';
  author_code: string;
  author_name: string;
  author_name_en: string;
  performance_right: string;
  reproduction_right: string;
}

export const EMPTY_AUTHOR: AuthorRow = {
  role: '', author_code: '', author_name: '', author_name_en: '',
  performance_right: '', reproduction_right: '',
};

// onSubmit에 넘기는 정규화 페이로드
export interface WorkSubmitPayload {
  no: number;
  komca_code: string;
  song_title: string;
  song_title_en: string | null;
  artist: string | null;
  artist_en: string | null;
  publish_date: string | null;
  iswc: string | null;
  authors: {
    role: WorkAuthorRole | null;
    author_code: string | null;
    author_name: string | null;
    author_name_en: string | null;
    performance_right: number | null;
    reproduction_right: number | null;
  }[];
}

export interface WorkFormInitial {
  no: string;
  komca_code: string;
  song_title: string;
  song_title_en: string;
  artist: string;
  artist_en: string;
  publish_date: string;
  iswc: string;
  authors: AuthorRow[];
}

const INPUT_CLASS =
  'w-full px-3 py-2 text-sm text-center bg-background border border-border rounded-lg outline-none focus:border-primary text-foreground';
const LABEL_CLASS = 'block text-xs text-center text-muted-foreground mb-1';
// 클릭 전 표시(읽기) 상태 — 텍스트만, hover로 편집 가능함을 암시
const DISPLAY_CLASS =
  'flex items-center justify-center w-full min-h-[2.375rem] px-3 py-2 text-sm text-center rounded-lg border border-transparent text-foreground hover:border-border hover:bg-muted/40 transition cursor-text';

// 텍스트/숫자 필드 — clickToEdit이면 클릭 시 입력칸으로 전환 (날짜는 커스텀 DatePicker 사용)
function FormTextField({ clickToEdit, type, value, onChange, placeholder, display }: {
  clickToEdit?: boolean;
  type: 'text' | 'number';
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  display?: (v: string) => string;
}) {
  const [editing, setEditing] = useState(false);
  if (!clickToEdit || editing) {
    // 숫자칸은 네이티브 스피너 대신 옆에 +/- 버튼(NumberInput)
    if (type === 'number') {
      return (
        <NumberInput
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoFocus={editing}
          onBlur={() => setEditing(false)}
          className={INPUT_CLASS}
          wrapperClassName="w-full"
        />
      );
    }
    return (
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        autoFocus={editing}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => setEditing(false)}
        className={INPUT_CLASS}
      />
    );
  }
  const shown = value ? (display ? display(value) : value) : '';
  return (
    <button type="button" onClick={() => setEditing(true)} className={DISPLAY_CLASS}>
      {shown || <span className="text-muted-foreground">{placeholder ?? '—'}</span>}
    </button>
  );
}

// 셀렉트 필드 — clickToEdit이면 클릭 시 셀렉트로 전환
function FormSelectField({ clickToEdit, value, onChange, options }: {
  clickToEdit?: boolean;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  const [editing, setEditing] = useState(false);
  if (!clickToEdit || editing) {
    return (
      <select
        value={value}
        autoFocus={editing}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => setEditing(false)}
        className={INPUT_CLASS}
      >
        <option value="">선택…</option>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    );
  }
  return (
    <button type="button" onClick={() => setEditing(true)} className={DISPLAY_CLASS}>
      {value || <span className="text-muted-foreground">선택</span>}
    </button>
  );
}

interface WorkFormProps {
  initial?: WorkFormInitial;
  submitLabel: string;
  submittingLabel: string;
  cancelHref: string;
  // 값 텍스트 표시 후 클릭 시 편집(수정 모드). 미지정(등록)은 입력칸 그대로
  clickToEdit?: boolean;
  // 성공 시 null, 실패 시 에러 메시지 반환. 성공 후 이동은 부모(onSubmit 내부)가 담당.
  onSubmit: (payload: WorkSubmitPayload) => Promise<string | null>;
}

export function WorkForm({ initial, submitLabel, submittingLabel, cancelHref, clickToEdit, onSubmit }: WorkFormProps) {
  const [form, setForm] = useState({
    no: initial?.no ?? '',
    komca_code: initial?.komca_code ?? '',
    song_title: initial?.song_title ?? '',
    song_title_en: initial?.song_title_en ?? '',
    artist: initial?.artist ?? '',
    artist_en: initial?.artist_en ?? '',
    publish_date: initial?.publish_date ?? '',
    iswc: initial?.iswc ?? '',
  });
  const [authors, setAuthors] = useState<AuthorRow[]>(
    initial?.authors && initial.authors.length > 0 ? initial.authors : [{ ...EMPTY_AUTHOR }]
  );
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const setField = (key: keyof typeof form, value: string) => setForm((f) => ({ ...f, [key]: value }));
  const setAuthorField = (idx: number, key: keyof AuthorRow, value: string) =>
    setAuthors((rows) => rows.map((r, i) => (i === idx ? { ...r, [key]: value } : r)));
  const addAuthor = () => setAuthors((rows) => [...rows, { ...EMPTY_AUTHOR }]);
  const removeAuthor = (idx: number) => setAuthors((rows) => rows.filter((_, i) => i !== idx));

  const handleSubmit = async () => {
    if (!form.no.trim()) { showToast('NO.를 입력하세요'); return; }
    if (!form.komca_code.trim()) { showToast('저작물코드를 입력하세요'); return; }
    if (!form.song_title.trim()) { showToast('곡명을 입력하세요'); return; }

    const toNum = (s: string) => (s.trim() === '' ? null : Number(s));
    const payload: WorkSubmitPayload = {
      no: Number(form.no),
      komca_code: form.komca_code.trim(),
      song_title: form.song_title.trim(),
      song_title_en: form.song_title_en.trim() || null,
      artist: form.artist.trim() || null,
      artist_en: form.artist_en.trim() || null,
      publish_date: form.publish_date.trim() || null,
      iswc: form.iswc.trim() || null,
      authors: authors
        .filter((a) => a.author_name.trim() || a.author_code.trim())
        .map((a) => ({
          role: a.role || null,
          author_code: a.author_code.trim() || null,
          author_name: a.author_name.trim() || null,
          author_name_en: a.author_name_en.trim() || null,
          performance_right: toNum(a.performance_right),
          reproduction_right: toNum(a.reproduction_right),
        })),
    };

    setSubmitting(true);
    const error = await onSubmit(payload);
    if (error) { showToast(error); setSubmitting(false); }
    // 성공 시 부모가 페이지 이동 → 상태 리셋 불필요
  };

  return (
    <div className="space-y-6">
      {/* 작품 정보 */}
      <div className="bg-card border border-border rounded-lg p-5">
        <h2 className="text-sm font-bold text-foreground mb-4">작품 정보</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <label className={LABEL_CLASS}>NO.</label>
            <FormTextField clickToEdit={clickToEdit} type="number" value={form.no} onChange={(v) => setField('no', v)} placeholder="예: 739" />
          </div>
          <div>
            <label className={LABEL_CLASS}>저작물코드(KOMCA)</label>
            <FormTextField clickToEdit={clickToEdit} type="text" value={form.komca_code} onChange={(v) => setField('komca_code', v)} />
          </div>
          <div>
            <label className={LABEL_CLASS}>공표일자</label>
            <div className="flex justify-center">
              <DatePicker
                value={form.publish_date}
                onChange={(v) => setField('publish_date', v)}
                placeholder="공표일자 선택"
                centerText
                startYear={1970}
                className={
                  clickToEdit
                    // 수정 모드: 평소엔 투명(다른 읽기 필드와 동일), hover 시에만 힌트
                    ? 'w-44 max-w-full flex items-center min-h-[2.375rem] px-3 py-2 text-sm rounded-lg border border-transparent text-foreground hover:border-border hover:bg-muted/40 transition cursor-pointer'
                    // 등록 모드: 다른 입력칸과 동일한 입력 스타일
                    : 'w-44 max-w-full flex items-center px-3 py-2 text-sm bg-background border border-border rounded-lg hover:border-primary transition cursor-pointer text-foreground'
                }
                // 수정 모드에서 달력을 열면(클릭) 다른 입력칸처럼 검은 블록 스타일로
                openClassName={
                  clickToEdit
                    ? 'w-44 max-w-full flex items-center min-h-[2.375rem] px-3 py-2 text-sm bg-background border border-primary rounded-lg cursor-pointer text-foreground'
                    : undefined
                }
              />
            </div>
          </div>
          <div>
            <label className={LABEL_CLASS}>곡명</label>
            <FormTextField clickToEdit={clickToEdit} type="text" value={form.song_title} onChange={(v) => setField('song_title', v)} />
          </div>
          <div>
            <label className={LABEL_CLASS}>영문 곡명</label>
            <FormTextField clickToEdit={clickToEdit} type="text" value={form.song_title_en} onChange={(v) => setField('song_title_en', v)} />
          </div>
          <div>
            <label className={LABEL_CLASS}>ISWC</label>
            <FormTextField clickToEdit={clickToEdit} type="text" value={form.iswc} onChange={(v) => setField('iswc', v)} />
          </div>
          <div>
            <label className={LABEL_CLASS}>아티스트</label>
            <FormTextField clickToEdit={clickToEdit} type="text" value={form.artist} onChange={(v) => setField('artist', v)} />
          </div>
          <div>
            <label className={LABEL_CLASS}>영문 아티스트</label>
            <FormTextField clickToEdit={clickToEdit} type="text" value={form.artist_en} onChange={(v) => setField('artist_en', v)} />
          </div>
        </div>
      </div>

      {/* 원작자 목록 */}
      <div className="bg-card border border-border rounded-lg p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-foreground">원작자</h2>
          <button onClick={addAuthor} className="px-3 py-1.5 text-xs border border-border text-foreground rounded-lg hover:bg-muted transition cursor-pointer">
            + 원작자 추가
          </button>
        </div>
        <div className="space-y-3">
          {authors.map((a, idx) => (
            <div key={idx} className="flex items-end gap-2 border border-border/60 rounded-lg p-3">
              <div className="grid grid-cols-2 md:grid-cols-12 gap-2 flex-1 min-w-0">
                <div className="md:col-span-2">
                  <label className={LABEL_CLASS}>포지션</label>
                  <FormSelectField clickToEdit={clickToEdit} value={a.role} onChange={(v) => setAuthorField(idx, 'role', v)} options={ROLE_OPTIONS} />
                </div>
                <div className="md:col-span-2">
                  <label className={LABEL_CLASS}>원작자코드</label>
                  <FormTextField clickToEdit={clickToEdit} type="text" value={a.author_code} onChange={(v) => setAuthorField(idx, 'author_code', v)} />
                </div>
                <div className="md:col-span-2">
                  <label className={LABEL_CLASS}>원작자명</label>
                  <FormTextField clickToEdit={clickToEdit} type="text" value={a.author_name} onChange={(v) => setAuthorField(idx, 'author_name', v)} />
                </div>
                <div className="md:col-span-2">
                  <label className={LABEL_CLASS}>영문명</label>
                  <FormTextField clickToEdit={clickToEdit} type="text" value={a.author_name_en} onChange={(v) => setAuthorField(idx, 'author_name_en', v)} />
                </div>
                <div className="md:col-span-2">
                  <label className={LABEL_CLASS}>공연권</label>
                  <FormTextField clickToEdit={clickToEdit} type="number" value={a.performance_right} onChange={(v) => setAuthorField(idx, 'performance_right', v)} />
                </div>
                <div className="md:col-span-2">
                  <label className={LABEL_CLASS}>복제권</label>
                  <FormTextField clickToEdit={clickToEdit} type="number" value={a.reproduction_right} onChange={(v) => setAuthorField(idx, 'reproduction_right', v)} />
                </div>
              </div>
              <button
                onClick={() => removeAuthor(idx)}
                disabled={authors.length === 1}
                aria-label="원작자 삭제"
                className="shrink-0 p-2.5 text-red-400 border border-border rounded-lg hover:bg-red-500/10 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* 액션 */}
      <div className="flex justify-end gap-2">
        <Link href={cancelHref} className="px-4 py-2 text-sm border border-border text-foreground rounded-lg hover:bg-muted transition">
          취소
        </Link>
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="px-5 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition font-medium cursor-pointer disabled:opacity-50"
        >
          {submitting ? submittingLabel : submitLabel}
        </button>
      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-foreground text-background text-sm px-4 py-2 rounded-full shadow-lg z-50 pointer-events-none">
          {toast}
        </div>
      )}
    </div>
  );
}
