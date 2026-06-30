import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

// Content-Security-Policy — Supabase(API/Realtime)·Google OAuth 아바타 도메인을 허용하도록 스코프.
// style/script의 'unsafe-inline'은 Next.js·Tailwind가 주입하는 인라인 스타일/부트스트랩 때문에 불가피.
// (XSS 코드 벡터는 별도로 0건 확인 — dangerouslySetInnerHTML/eval 미사용)
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net",
  "img-src 'self' blob: data: https://*.googleusercontent.com https://*.supabase.co",
  "font-src 'self' https://cdn.jsdelivr.net",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join("; ");

// 전역 보안 헤더 — 개인정보(PII)를 다루는 ERP라 클릭재킹·MIME 스니핑·정보유출 방어를 기본 적용.
const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
  // HSTS — HTTPS 강제(프로덕션 한정). 로컬 http 개발 환경엔 적용하지 않는다.
  ...(isDev
    ? []
    : [
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains; preload",
        },
      ]),
];

const nextConfig: NextConfig = {
  allowedDevOrigins: ['*.trycloudflare.com'],
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default nextConfig;
