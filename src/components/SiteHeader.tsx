"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileStack } from "lucide-react";

const links = [
  { href: "/editor", label: "Editor" },
  { href: "/tools/merge", label: "Merge" },
  { href: "/tools/split", label: "Split" },
  { href: "/tools/compress", label: "Compress" },
];

export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="relative z-20 border-b border-[var(--ink)]/10 bg-[var(--paper)]/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        <Link href="/" className="group flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--ink)] text-[var(--paper)] transition-transform group-hover:scale-105">
            <FileStack className="h-5 w-5" strokeWidth={1.75} />
          </span>
          <span className="font-[family-name:var(--font-display)] text-xl tracking-tight text-[var(--ink)]">
            Folio
          </span>
        </Link>

        <nav className="hidden items-center gap-1 sm:flex">
          {links.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-md px-3 py-2 text-sm transition-colors ${
                  active
                    ? "bg-[var(--ink)]/8 font-medium text-[var(--ink)]"
                    : "text-[var(--muted)] hover:text-[var(--ink)]"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <Link
          href="/editor"
          className="rounded-md bg-[var(--accent)] px-3.5 py-2 text-sm font-semibold text-[var(--ink)] transition hover:brightness-95"
        >
          Open editor
        </Link>
      </div>
    </header>
  );
}
