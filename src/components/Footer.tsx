import Link from "next/link";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-[var(--ink)]/10 bg-[var(--paper-deep)]">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-10 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-[family-name:var(--font-display)] text-lg text-[var(--ink)]">
            Folio
          </p>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Edit PDFs in the browser. Pay per file — no monthly trap.
          </p>
        </div>
        <div className="flex gap-5 text-sm text-[var(--muted)]">
          <Link href="/pricing" className="hover:text-[var(--ink)]">
            Pricing
          </Link>
          <Link href="/tools/merge" className="hover:text-[var(--ink)]">
            Tools
          </Link>
        </div>
      </div>
    </footer>
  );
}
