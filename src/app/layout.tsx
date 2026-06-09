import type { Metadata } from "next";
import { cookies } from "next/headers";
import { ThemeProvider } from "next-themes";
import "./globals.css";

export const metadata: Metadata = {
  title: "PRISM FILTER - 정산 자동화 시스템",
  description: "프리즘필터 뮤직그룹 전속작가 정산 자동화 시스템",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // SSR: 서버에서 쿠키 읽어 초기 테마 설정 (FOUC 방지)
  const cookieStore = await cookies();
  const theme = cookieStore.get("prism-theme")?.value || "dark";

  return (
    <html lang="ko" suppressHydrationWarning className={theme}>
      <body className="antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme={theme}
          themes={["light", "dark", "classic-dark"]}
          enableSystem={false}
          forcedTheme={theme}
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
