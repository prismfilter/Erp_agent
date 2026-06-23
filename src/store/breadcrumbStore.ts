import { create } from 'zustand';

// 브레드크럼 제목 동적 덮어쓰기 스토어.
// 동적 라우트(상세 페이지 등)에서 실제 데이터명(예: 거래처명)을 헤더에 표시하기 위해 사용.
// 페이지가 마운트 시 setOverride, 언마운트 시 clear를 호출하면 SiteHeader가 경로 기반 라벨보다 우선 적용한다.
interface BreadcrumbState {
  override: string | null;
  setOverride: (title: string | null) => void;
  clear: () => void;
}

export const useBreadcrumbStore = create<BreadcrumbState>((set) => ({
  override: null,
  setOverride: (title) => set({ override: title }),
  clear: () => set({ override: null }),
}));
