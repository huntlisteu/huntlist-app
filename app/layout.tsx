import type { Metadata } from "next";
import { DM_Sans, Sora } from "next/font/google";

import { ThemeProvider } from "@/components/brand/ThemeProvider";
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
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
