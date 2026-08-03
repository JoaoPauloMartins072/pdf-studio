import type { Metadata } from "next";
import { Fraunces, DM_Sans } from "next/font/google";
import { AppChrome } from "@/components/AppChrome";
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} h-full`}>
      <body className="relative flex min-h-full flex-col font-[family-name:var(--font-body)] antialiased">
        <AppChrome>{children}</AppChrome>
      </body>
    </html>
  );
}
