import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Editor - Folio",
  description: "Edit PDFs in the browser: text, draw, highlight, sign, images, pages.",
};

export default function EditorLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-screen bg-zinc-100">{children}</div>;
}
