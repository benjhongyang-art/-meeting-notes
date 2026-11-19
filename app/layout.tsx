import type { Metadata } from "next";
import { Geist_Mono, Noto_Sans_TC } from "next/font/google";
import type { ReactNode } from "react";
import "./globals.css";

const noto = Noto_Sans_TC({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-noto",
  display: "swap",
});

const mono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "會記 — 會議逐字稿與紀錄",
  description:
    "在瀏覽器錄音或上傳音檔，轉成繁體中文逐字稿，並整理成可編輯的會議紀錄。",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="zh-Hant-TW"
      className={`${noto.variable} ${mono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-background text-foreground">{children}</body>
    </html>
  );
}
