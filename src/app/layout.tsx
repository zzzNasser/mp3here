import type { Metadata, Viewport } from "next";
import Script from "next/script";

import { adsenseClientId } from "@/lib/ads";

import "./globals.css";

export const metadata: Metadata = {
  title: "Mp3Here",
  description: "Simple YouTube to MP3 downloader with cover artwork.",
};

export const viewport: Viewport = {
  themeColor: "#f3f4f6",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <head>
        <Script
          id="adsense-script"
          strategy="afterInteractive"
          async
          src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsenseClientId}`}
          crossOrigin="anonymous"
        />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
