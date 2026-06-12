import type { Metadata } from "next";
import { DM_Sans, Sora } from "next/font/google";

import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

import { ThemeProvider } from "@/components/brand/ThemeProvider";
import PWARegister from "@/components/PWARegister";
import "./globals.css";

// Sora (800) -> titoli; DM Sans -> corpo. Esposti come CSS variables e mappati
// in tailwind.config.ts (font-heading / font-sans).
const sora = Sora({
  subsets: ["latin"],
  weight: "800",
  variable: "--font-sora",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Huntlist",
  description:
    "Il marketplace delle mancaliste TCG: pubblica cosa cerchi, ricevi offerte per l'intero lotto.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="it"
      suppressHydrationWarning
      className={`${sora.variable} ${dmSans.variable}`}
    >
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#1A1A18" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Huntlist" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body suppressHydrationWarning>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
        <PWARegister />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
