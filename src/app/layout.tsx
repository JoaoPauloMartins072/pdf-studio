import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Fraunces, DM_Sans } from "next/font/google";
import { SiteLayoutSwitcher } from "@/components/SiteLayoutSwitcher";
import "./globals.css";

const display = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
});

const body = DM_Sans({
  variable: "--font-body",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Folio — Edit PDFs",
  description:
    "Browser PDF editor and tools. Edit text, draw, highlight, sign — download your finished file.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} h-full`}>
      <body className="relative flex min-h-full flex-col font-[family-name:var(--font-body)] antialiased">
        <SiteLayoutSwitcher>{children}</SiteLayoutSwitcher>
      </body>
    </html>
  );
}
