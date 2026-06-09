import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PRISM FILTER - 정산 자동화 시스템",
  description: "프리즘필터 뮤직그룹 전속작가 정산 자동화 시스템",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body className="antialiased">{children}</body>
    </html>
  );
}
