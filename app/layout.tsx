import type { Metadata } from "next";
import { DM_Sans, Fraunces } from "next/font/google";

import { ThemeProvider } from "@/components/brand/ThemeProvider";
import "./globals.css";

// Fraunces -> titoli; DM Sans -> corpo. Esposti come CSS variables e mappati
// in tailwind.config.ts (font-heading / font-sans).
const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
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
      className={`${fraunces.variable} ${dmSans.variable}`}
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
