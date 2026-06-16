import type { Metadata } from "next";
import { ThemeProvider } from "next-themes";
import "./globals.css";

export const metadata: Metadata = {
  title: "PRISMFILTER MUSIC GROUP - 정산 자동화 시스템",
  description: "프리즘필터 뮤직그룹 전속작가 정산 자동화 시스템",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      {/* subpixel-antialiased: Windows ClearType 서브픽셀 렌더링 → 작은 글씨 선명(흐림 방지) */}
      <body className="subpixel-antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          themes={["light", "dark", "classic-dark"]}
          enableSystem={false}
          storageKey="prism-theme"
          disableTransitionOnChange={false}
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
