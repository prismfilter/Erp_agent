'use client';

// 거래처 상세 — 값 셀 컨트롤. 값에 hover하면 옆에 복사·연필 아이콘이 나타난다(작가 마스터 방식).
// 연필 클릭 시 작은 입력칸으로 편집(ADMIN만), 클립보드 클릭 시 값 복사. 단일 필드 PATCH.
// 라벨은 상위 테이블의 첫 열이 담당. 텍스트 정렬: 값·아이콘 한 덩어리 가운데. 빈 값 저장 시 null(미입력)로 클리어.

import { useState, useCallback } from 'react';

interface EditableFieldProps {
  apiPath: string;
  field: string;
  label: string;
  value: string | null;
  editable: boolean;
  onSaved: (field: string, value: string | null) => void;
}

export function EditableField({
  apiPath,
  field,
  label,
  value,
  editable,
  onSaved,
}: EditableFieldProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? '');
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleSave = useCallback(async () => {
    if (saving) return;
    const trimmed = draft.trim();
    const next = trimmed === '' ? null : trimmed;
    if (next === (value ?? null)) {
      setIsEditing(false);
      setDraft(value ?? '');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(apiPath, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: next }),
      });
      if (res.ok) {
        onSaved(field, next);
        setIsEditing(false);
      } else {
        // 실패 시 원복
        setDraft(value ?? '');
      }
    } finally {
      setSaving(false);
    }
  }, [apiPath, field, draft, value, onSaved, saving]);

  // 값 복사 — 클립보드에 쓰고 1.2초간 체크 아이콘 피드백
  const handleCopy = useCallback(async () => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      // 클립보드 접근 실패(권한/비보안 컨텍스트) 시 무시
    }
  }, [value]);

  if (isEditing) {
    return (
      <input
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleSave();
          if (e.key === 'Escape') { setDraft(value ?? ''); setIsEditing(false); }
        }}
        onBlur={handleSave}
        autoFocus
        disabled={saving}
        className="w-40 max-w-full px-2 py-1 text-xs text-center bg-background border border-primary rounded outline-none text-foreground"
      />
    );
  }

  // 비편집: 값을 셀 정중앙에 두고, hover 시 값 오른쪽 끝에 연필(좌)·복사(우) 아이콘을 절대배치로 노출.
  // 절대배치는 폭 계산에서 제외되어 값이 정확히 가운데 오고, 아이콘은 값에 붙어 함께 이동(EmailCell 패턴).
  return (
    <span className="relative inline-block group">
      {value ? (
        <span className="text-foreground">{value}</span>
      ) : (
        <span className="text-muted-foreground">미입력</span>
      )}
      {(editable || value) && (
        <span className="absolute left-full top-1/2 -translate-y-1/2 ml-1 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition">
          {editable && (
            <button
              type="button"
              onClick={() => { setDraft(value ?? ''); setIsEditing(true); }}
              className="p-1 text-muted-foreground hover:text-foreground transition rounded hover:bg-primary/10 cursor-pointer"
              title={`${label} 수정`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
              </svg>
            </button>
          )}
          {value && (
            <button
              type="button"
              onClick={handleCopy}
              className="p-1 text-muted-foreground hover:text-foreground transition rounded hover:bg-primary/10 cursor-pointer"
              title={`${label} 복사`}
            >
              {copied ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                  <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                </svg>
              )}
            </button>
          )}
        </span>
      )}
    </span>
  );
}
