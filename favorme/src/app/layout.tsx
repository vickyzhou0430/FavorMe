import type { Metadata } from "next";
import { Quicksand } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";

const quicksand = Quicksand({
  subsets: ["latin"],
  variable: "--font-quicksand",
  display: "swap",
});

export const metadata: Metadata = {
  title: "FavorMe",
  description: "Everything happens for your good · Web app demo",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={quicksand.variable}>
      <body className="font-sans antialiased">
        <div className="min-h-dvh bg-app">
          <Providers>{children}</Providers>
        </div>
      </body>
    </html>
  );
}
