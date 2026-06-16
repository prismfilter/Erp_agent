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
      {/* antialiased(grayscale): 서브픽셀 색번짐 노이즈 없이 또렷. static Pretendard 힌팅으로 작은 글씨 선명 */}
      <body className="antialiased">
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
