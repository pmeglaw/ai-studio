import type { Metadata } from "next";
import { Source_Sans_3, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { SignOutButton } from "@/components/sign-out-button";

const sourceSans = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-source-sans",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-plex-mono",
});

export const metadata: Metadata = {
  title: "Lien Ledger",
  description: "Per-case medical lien tracking and settlement gate.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body
        className={`${sourceSans.variable} ${plexMono.variable} font-sans antialiased`}
      >
        <header className="border-b border-line bg-surface">
          <div className="mx-auto flex max-w-5xl items-baseline justify-between px-6 py-4">
            <a
              href="/"
              className="font-mono text-sm font-medium tracking-[0.2em] uppercase"
            >
              Lien Ledger
            </a>
            <span className="font-mono text-xs text-muted">
              nothing missed at settlement
            </span>
            <SignOutButton />
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
      </body>
    </html>
  );
}
