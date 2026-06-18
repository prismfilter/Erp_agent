'use client';

// 이메일 셀 — 이메일 표시 + 복사 버튼(사용자 ID 컬럼 대체). 두 페이지(구성원/관리자) 공용.
// 가운데 정렬: 이메일 텍스트만 정중앙 기준, 복사 아이콘은 텍스트 오른쪽에 절대배치로 붙여
// (폭 계산에서 제외되어 텍스트가 정확히 가운데 오고, 아이콘은 텍스트와 함께 이동).
export function EmailCell({ email, onCopy }: { email: string | null; onCopy: (text: string) => void }) {
  if (!email) {
    return <span className="text-muted-foreground text-xs italic">미확인</span>;
  }
  return (
    <span className="relative inline-block group">
      <span className="text-foreground text-xs cursor-default" title={email}>{email}</span>
      <button
        onClick={() => onCopy(email)}
        className="absolute left-full top-1/2 -translate-y-1/2 ml-1 opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-foreground transition rounded hover:bg-blue-600/10 cursor-pointer"
        title="이메일 복사"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/>
          <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
        </svg>
      </button>
    </span>
  );
}
