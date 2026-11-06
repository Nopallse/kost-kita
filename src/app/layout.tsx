import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const sansFont = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

const monoFont = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#FAF9F5",
};

export const metadata: Metadata = {
  title: "KostKita — Shared Living Financial Clarity",
  description:
    "Manage roommate shared expenses, personal allocations, and debt settlements with mathematical precision.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className={`${sansFont.variable} ${monoFont.variable}`}>
      <body className="min-h-screen bg-background font-sans text-foreground antialiased selection:bg-stone-200">
        {children}
      </body>
    </html>
  );
}

