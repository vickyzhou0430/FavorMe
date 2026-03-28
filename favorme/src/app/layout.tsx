import type { Metadata } from "next";
import { Quicksand } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";
import {
  appBackgroundGradient,
  bodyFallbackStyle,
  rootCssVarsStyle,
} from "@/lib/root-inline-styles";
import type { CSSProperties } from "react";

const quicksand = Quicksand({
  subsets: ["latin"],
  variable: "--font-quicksand",
  display: "swap",
});

export const metadata: Metadata = {
  title: "FavorMe 心安指南",
  description: "轻治愈情绪决策辅助工具",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const shellStyle = {
    minHeight: "100dvh",
    background: appBackgroundGradient,
  } satisfies CSSProperties;

  return (
    <html lang="zh-CN" className={quicksand.variable} style={rootCssVarsStyle}>
      <body className="font-sans antialiased" style={bodyFallbackStyle}>
        <div className="min-h-dvh bg-app" style={shellStyle}>
          <Providers>{children}</Providers>
        </div>
      </body>
    </html>
  );
}
