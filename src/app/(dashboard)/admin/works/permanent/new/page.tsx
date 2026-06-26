'use client';

// 저작물 신규 등록 페이지 — 작품 정보 + 원작자 다건 입력 후 등록(ADMIN only)
// 목록의 '+ 저작물 추가'에서 진입. 등록 성공 시 목록으로 복귀.

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import type { WorkAuthorRole } from '@/types/invoice';

// 포지션 옵션 (코드 표기). A=작사 / C=작곡 / AR=편곡
const ROLE_OPTIONS: { value: WorkAuthorRole; label: string }[] = [
  { value: 'A', label: 'A' },
  { value: 'C', label: 'C' },
  { value: 'AR', label: 'AR' },
];

interface AuthorRow {
  role: WorkAuthorRole | '';
  author_code: string;
  author_name: string;
  author_name_en: string;
  performance_right: string;
  reproduction_right: string;
}

const EMPTY_AUTHOR: AuthorRow = {
  role: '', author_code: '', author_name: '', author_name_en: '',
  performance_right: '', reproduction_right: '',
};

const INPUT_CLASS =
  'w-full px-3 py-2 text-sm text-center bg-background border border-border rounded-lg outline-none focus:border-primary text-foreground';
const LABEL_CLASS = 'block text-xs text-center text-muted-foreground mb-1';

export default function WorkNewPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN';

  const [form, setForm] = useState({
    no: '', komca_code: '', song_title: '', song_title_en: '',
    artist: '', artist_en: '', publish_date: '', iswc: '',
  });
  const [authors, setAuthors] = useState<AuthorRow[]>([{ ...EMPTY_AUTHOR }]);
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
    const payloadAuthors = authors
      .filter((a) => a.author_name.trim() || a.author_code.trim())
      .map((a) => ({
        role: a.role || null,
        author_code: a.author_code.trim() || null,
        author_name: a.author_name.trim() || null,
        author_name_en: a.author_name_en.trim() || null,
        performance_right: toNum(a.performance_right),
        reproduction_right: toNum(a.reproduction_right),
      }));

    setSubmitting(true);
    try {
      const res = await fetch('/api/works', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          no: Number(form.no),
          komca_code: form.komca_code.trim(),
          song_title: form.song_title.trim(),
          song_title_en: form.song_title_en.trim() || null,
          artist: form.artist.trim() || null,
          artist_en: form.artist_en.trim() || null,
          publish_date: form.publish_date.trim() || null,
          iswc: form.iswc.trim() || null,
          authors: payloadAuthors,
        }),
      });
      if (res.ok) {
        router.push('/admin/works/permanent');
      } else {
        showToast((await res.json()).error || '등록 실패');
      }
    } catch {
      showToast('등록 중 오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="bg-card border border-border rounded-lg p-8 text-center">
        <p className="text-muted-foreground">저작물 등록은 관리자만 가능합니다.</p>
        <Link href="/admin/works/permanent" className="inline-block mt-4 text-sm text-primary hover:underline">
          목록으로 돌아가기
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">저작물 추가</h1>
        <p className="text-muted-foreground text-sm">작품 정보와 원작자를 입력해 등록합니다.</p>
      </div>

      {/* 작품 정보 */}
      <div className="bg-card border border-border rounded-lg p-5">
        <h2 className="text-sm font-bold text-foreground mb-4">작품 정보</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <label className={LABEL_CLASS}>NO.</label>
            <input type="number" value={form.no} onChange={(e) => setField('no', e.target.value)} placeholder="예: 739" className={INPUT_CLASS} />
          </div>
          <div>
            <label className={LABEL_CLASS}>저작물코드(KOMCA)</label>
            <input type="text" value={form.komca_code} onChange={(e) => setField('komca_code', e.target.value)} className={INPUT_CLASS} />
          </div>
          <div>
            <label className={LABEL_CLASS}>공표일자</label>
            <input type="date" value={form.publish_date} onChange={(e) => setField('publish_date', e.target.value)} className={INPUT_CLASS} />
          </div>
          <div>
            <label className={LABEL_CLASS}>곡명</label>
            <input type="text" value={form.song_title} onChange={(e) => setField('song_title', e.target.value)} className={INPUT_CLASS} />
          </div>
          <div>
            <label className={LABEL_CLASS}>영문 곡명</label>
            <input type="text" value={form.song_title_en} onChange={(e) => setField('song_title_en', e.target.value)} className={INPUT_CLASS} />
          </div>
          <div>
            <label className={LABEL_CLASS}>ISWC</label>
            <input type="text" value={form.iswc} onChange={(e) => setField('iswc', e.target.value)} className={INPUT_CLASS} />
          </div>
          <div>
            <label className={LABEL_CLASS}>아티스트</label>
            <input type="text" value={form.artist} onChange={(e) => setField('artist', e.target.value)} className={INPUT_CLASS} />
          </div>
          <div>
            <label className={LABEL_CLASS}>영문 아티스트</label>
            <input type="text" value={form.artist_en} onChange={(e) => setField('artist_en', e.target.value)} className={INPUT_CLASS} />
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
            <div key={idx} className="grid grid-cols-2 md:grid-cols-12 gap-2 items-end border border-border/60 rounded-lg p-3">
              <div className="md:col-span-2">
                <label className={LABEL_CLASS}>포지션</label>
                <select value={a.role} onChange={(e) => setAuthorField(idx, 'role', e.target.value)} className={INPUT_CLASS}>
                  <option value="">선택…</option>
                  {ROLE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className={LABEL_CLASS}>원작자코드</label>
                <input type="text" value={a.author_code} onChange={(e) => setAuthorField(idx, 'author_code', e.target.value)} className={INPUT_CLASS} />
              </div>
              <div className="md:col-span-2">
                <label className={LABEL_CLASS}>원작자명</label>
                <input type="text" value={a.author_name} onChange={(e) => setAuthorField(idx, 'author_name', e.target.value)} className={INPUT_CLASS} />
              </div>
              <div className="md:col-span-2">
                <label className={LABEL_CLASS}>영문명</label>
                <input type="text" value={a.author_name_en} onChange={(e) => setAuthorField(idx, 'author_name_en', e.target.value)} className={INPUT_CLASS} />
              </div>
              <div className="md:col-span-1">
                <label className={LABEL_CLASS}>공연권</label>
                <input type="number" step="any" value={a.performance_right} onChange={(e) => setAuthorField(idx, 'performance_right', e.target.value)} className={INPUT_CLASS} />
              </div>
              <div className="md:col-span-1">
                <label className={LABEL_CLASS}>복제권</label>
                <input type="number" step="any" value={a.reproduction_right} onChange={(e) => setAuthorField(idx, 'reproduction_right', e.target.value)} className={INPUT_CLASS} />
              </div>
              <div className="md:col-span-2 flex justify-center">
                <button
                  onClick={() => removeAuthor(idx)}
                  disabled={authors.length === 1}
                  className="px-3 py-2 text-xs text-red-400 border border-border rounded-lg hover:bg-red-500/10 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  삭제
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 액션 */}
      <div className="flex justify-end gap-2">
        <Link href="/admin/works/permanent" className="px-4 py-2 text-sm border border-border text-foreground rounded-lg hover:bg-muted transition">
          취소
        </Link>
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="px-5 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition font-medium cursor-pointer disabled:opacity-50"
        >
          {submitting ? '등록 중...' : '등록'}
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
