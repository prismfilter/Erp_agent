'use client';

// 작가 플레이리스트 URL(최대 3개). 스포티파이면 둥근 스포티파이 아이콘, 그 외엔 둥근 링크 아이콘.
// 빈 상태/추가: 링크 아이콘 클릭 → URL 입력. ADMIN만 추가·삭제(hover ×).

import { useState } from 'react';
import { Link as LinkIcon, X } from 'lucide-react';

const MAX_LINKS = 3;

// 스포티파이 URL 판별
function isSpotify(url: string): boolean {
  return url.toLowerCase().includes('spotify.com');
}

// 공식 스포티파이 글리프(둥근 로고) — lucide엔 브랜드 아이콘이 없어 인라인 SVG 사용
function SpotifyIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56-.299.421-1.02.599-1.559.3z" />
    </svg>
  );
}

export function PlaylistLinks({
  urls,
  editable,
  onChange,
}: {
  urls: string[];
  editable: boolean;
  onChange: (next: string[]) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState('');

  const canAdd = editable && urls.length < MAX_LINKS;

  const commit = () => {
    const raw = draft.trim();
    if (!raw) { setAdding(false); setDraft(''); return; }
    // 프로토콜 누락 시 https:// 보정
    const normalized = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    try {
      new URL(normalized); // 형식 검증
    } catch {
      return; // 유효하지 않으면 입력 유지
    }
    onChange([...urls, normalized]);
    setDraft('');
    setAdding(false);
  };

  const remove = (idx: number) => onChange(urls.filter((_, i) => i !== idx));

  return (
    <div className="flex items-center justify-center gap-2">
      {urls.map((url, i) => (
        <span key={i} className="relative group inline-flex">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            title={url}
            className="inline-flex items-center justify-center w-7 h-7 rounded-full transition cursor-pointer hover:opacity-80"
          >
            {isSpotify(url) ? (
              <SpotifyIcon className="w-7 h-7 text-[#1DB954]" />
            ) : (
              <span className="inline-flex items-center justify-center w-7 h-7 rounded-full border border-border text-muted-foreground hover:text-primary hover:border-primary">
                <LinkIcon className="w-3.5 h-3.5" />
              </span>
            )}
          </a>
          {editable && (
            <button
              type="button"
              onClick={() => remove(i)}
              title="삭제"
              className="absolute -top-1.5 -right-1.5 hidden group-hover:flex items-center justify-center w-4 h-4 rounded-full bg-red-500 text-white cursor-pointer"
            >
              <X className="w-2.5 h-2.5" />
            </button>
          )}
        </span>
      ))}

      {canAdd &&
        (adding ? (
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commit();
              if (e.key === 'Escape') { setDraft(''); setAdding(false); }
            }}
            onBlur={commit}
            placeholder="URL 입력..."
            className="w-48 px-2 py-1 text-xs text-center bg-transparent border border-primary rounded outline-none text-foreground"
          />
        ) : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            title="플레이리스트 URL 추가"
            className="inline-flex items-center justify-center w-7 h-7 rounded-full border border-border text-muted-foreground hover:text-primary hover:border-primary transition cursor-pointer"
          >
            <LinkIcon className="w-3.5 h-3.5" />
          </button>
        ))}

      {!editable && urls.length === 0 && <span className="text-muted-foreground text-xs">-</span>}
    </div>
  );
}
