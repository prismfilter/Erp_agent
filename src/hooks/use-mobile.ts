import * as React from "react"

const MOBILE_BREAKPOINT = 768

// 외부 스토어(matchMedia) 구독 — effect 내 setState 없이 동기화
function subscribe(callback: () => void) {
  const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
  mql.addEventListener("change", callback)
  return () => mql.removeEventListener("change", callback)
}

export function useIsMobile() {
  return React.useSyncExternalStore(
    subscribe,
    () => window.innerWidth < MOBILE_BREAKPOINT, // 클라이언트 스냅샷
    () => false // 서버 스냅샷 (SSR 기본값)
  )
}
