import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/Header";
import { Providers } from "@/components/Providers";
import TerminalsManager from "@/components/terminal/TerminalsManager";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Dockerflare",
  description: "Cloudflare Zero Trust Docker Management",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} grid grid-rows-[auto_1fr] antialiased h-screen bg-background max-h-screen overflow-clip`}
      >
        <Providers>
          <Header />
          <div className="relative flex">{children}</div>
        </Providers>
      </body>
    </html>
  );
}
