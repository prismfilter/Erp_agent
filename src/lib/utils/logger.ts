// 개발 환경 전용 로거 — 프로덕션에서는 디버그 로그를 출력하지 않는다.
// 사용자 이메일·세션 등이 프로덕션 콘솔에 남지 않도록 log/warn은 dev에서만 동작.
// error는 운영 진단을 위해 항상 출력한다.

const isDev = process.env.NODE_ENV !== 'production';

export const logger = {
  log: (...args: unknown[]) => {
    if (isDev) console.log(...args);
  },
  warn: (...args: unknown[]) => {
    if (isDev) console.warn(...args);
  },
  error: (...args: unknown[]) => {
    console.error(...args);
  },
};
