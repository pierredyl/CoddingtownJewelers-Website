import type { Metadata, Viewport } from "next";
import { SITE_CONFIG } from "@/config/site";
import "./globals.css";

export const metadata: Metadata = {
  title: SITE_CONFIG.metadata.title,
  description: SITE_CONFIG.metadata.description,
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&family=Lora:ital,wght@0,500;0,600;0,700;1,500&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap"
        />
      </head>
      <body className="min-h-dvh bg-canvas text-ink antialiased selection:bg-gold-soft selection:text-obsidian">
        {children}
      </body>
    </html>
  );
}
