import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ErrorBoundary } from "@/components/error-boundary";
import { SuppressExtensionErrors } from "@/components/suppress-extension-errors";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
title: "Video Downloader - Download Videos from YouTube, Twitter, & More",
description: "Free online video downloader for YouTube, Twitter, and Reddit. Fast, reliable, and easy to use. No registration required.",
keywords: "video downloader, youtube downloader, twitter video download, reddit video download",
  authors: [{ name: "Video Downloader" }],
  openGraph: {
    title: "Video Downloader - Multi-Platform Video Downloads",
    description: "Download videos from your favorite platforms with ease",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <script src="/suppress-errors.js" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-black text-white`}
        suppressHydrationWarning
      >
        <SuppressExtensionErrors />
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
      </body>
    </html>
  );
}
