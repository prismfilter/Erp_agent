'use client';

// 거래처 상세 — 라벨+값 인라인 편집 카드. ADMIN만 편집 가능, 단일 필드 PATCH.
// 텍스트 정렬: 라벨·값·입력칸 모두 가운데. 빈 값 저장 시 null(미입력)로 클리어.

import { useState, useCallback } from 'react';

interface EditableFieldProps {
  clientId: string;
  field: string;
  label: string;
  value: string | null;
  editable: boolean;
  onSaved: (field: string, value: string | null) => void;
}

export function EditableField({
  clientId,
  field,
  label,
  value,
  editable,
  onSaved,
}: EditableFieldProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? '');
  const [saving, setSaving] = useState(false);

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
      const res = await fetch(`/api/clients/${clientId}`, {
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
  }, [clientId, field, draft, value, onSaved, saving]);

  return (
    <div className="rounded-lg border border-border bg-card px-4 py-3 flex flex-col items-center gap-1.5">
      <span className="text-xs text-muted-foreground text-center">{label}</span>
      {isEditing ? (
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
          className="w-full px-2 py-1 text-sm text-center bg-background border border-primary rounded outline-none text-foreground"
        />
      ) : editable ? (
        <button
          type="button"
          onClick={() => { setDraft(value ?? ''); setIsEditing(true); }}
          className="w-full px-2 py-1 text-sm text-center text-foreground rounded hover:bg-primary/10 transition cursor-pointer"
          title="클릭하여 수정"
        >
          {value ? value : <span className="text-muted-foreground">미입력</span>}
        </button>
      ) : (
        <span className="text-sm text-center text-foreground">
          {value ? value : <span className="text-muted-foreground">미입력</span>}
        </span>
      )}
    </div>
  );
}
