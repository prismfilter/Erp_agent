'use client';

// 검색으로 진입한 표 행으로 스크롤 + 잠깐 하이라이트(마우스 호버 느낌).
// URL ?focus=<id> 를 읽어 id={`row-<id>`} 요소를 찾는다. ready(데이터 로드 완료) 시 1회 실행.
// useSearchParams 대신 window.location.search 사용 → App Router의 Suspense 경계 요구 회피.

import { useEffect } from 'react';

export function useRowFocus(ready: boolean): void {
  useEffect(() => {
    if (!ready) return;
    const focusId = new URLSearchParams(window.location.search).get('focus');
    if (!focusId) return;
    const el = document.getElementById(`row-${focusId}`);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.classList.add('row-focus-highlight');
    const timer = window.setTimeout(() => el.classList.remove('row-focus-highlight'), 2200);
    return () => window.clearTimeout(timer);
  }, [ready]);
}
