'use client';

// 테이블 정렬 공용 훅 — 한 번에 한 컬럼만 정렬 (오름/내림 토글)
// 각 페이지가 accessor 맵(정렬키 → 행에서 비교값 추출 함수)을 전달

import { useState, useCallback } from 'react';

export type SortDir = 'asc' | 'desc';

type SortValue = string | number | null | undefined;
type Accessors<T> = Record<string, (row: T) => SortValue>;

export function useTableSort<T>(accessors: Accessors<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [dir, setDir] = useState<SortDir>('desc');

  // 3단계 순환: 해제 → 내림차순(desc) → 오름차순(asc) → 해제
  // 다른 컬럼 클릭 시 → 그 컬럼의 내림차순부터 시작
  const toggle = useCallback(
    (key: string) => {
      if (sortKey !== key) {
        setSortKey(key);
        setDir('desc');
      } else if (dir === 'desc') {
        setDir('asc');
      } else {
        // asc 상태에서 재클릭 → 정렬 해제(원래 순서)
        setSortKey(null);
        setDir('desc');
      }
    },
    [sortKey, dir]
  );

  // 필터링된 배열에 정렬 적용 (sortKey null이면 원본 순서 유지)
  const sortRows = useCallback(
    (rows: T[]): T[] => {
      if (!sortKey) return rows;
      const accessor = accessors[sortKey];
      if (!accessor) return rows;

      const factor = dir === 'asc' ? 1 : -1;
      // 원본 불변 — 복사 후 정렬
      return [...rows].sort((a, b) => {
        const va = accessor(a);
        const vb = accessor(b);

        // null/undefined/빈 문자열은 항상 뒤로 (정렬 방향과 무관)
        const aEmpty = va == null || va === '';
        const bEmpty = vb == null || vb === '';
        if (aEmpty && bEmpty) return 0;
        if (aEmpty) return 1;  // a가 빈값 → 뒤로
        if (bEmpty) return -1; // b가 빈값 → a가 앞

        // 양쪽 숫자면 산술 비교, 아니면 한글 로케일 문자열 비교
        if (typeof va === 'number' && typeof vb === 'number') {
          return (va - vb) * factor;
        }
        return String(va).localeCompare(String(vb), 'ko') * factor;
      });
    },
    [sortKey, dir, accessors]
  );

  return { sortKey, dir, toggle, sortRows };
}
