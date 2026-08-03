import { PRICE_LABEL, PRICE_PER_PDF_CENTS, TOOLS } from "@/lib/pricing";
import Link from "next/link";

export default function PricingPage() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-16">
      <p className="text-sm font-medium uppercase tracking-[0.18em] text-[var(--muted)]">
        Pricing
      </p>
      <h1 className="mt-3 font-[family-name:var(--font-display)] text-4xl tracking-tight text-[var(--ink)] sm:text-5xl">
        Pay per finished PDF
      </h1>
      <p className="mt-4 max-w-xl text-base text-[var(--muted)]">
        No monthly subscription. Process in your browser, unlock the download when you are happy
        with the result. Apple Pay, Google Pay and cards via Stripe.
      </p>

      <div className="mt-12 rounded-3xl border border-[var(--ink)]/10 bg-white/70 p-8 shadow-[0_30px_80px_-40px_rgba(28,36,28,0.5)]">
        <p className="font-[family-name:var(--font-display)] text-5xl text-[var(--ink)]">
          {PRICE_LABEL}
        </p>
        <p className="mt-2 text-sm text-[var(--muted)]">
          per unlocked file · {(PRICE_PER_PDF_CENTS / 100).toFixed(2)} EUR
        </p>
        <ul className="mt-8 space-y-3 text-sm text-[var(--ink)]">
          <li>✓ Merge, split & compress (MVP)</li>
          <li>✓ Files stay on your device until download</li>
          <li>✓ One-time checkout — Apple Pay ready via Stripe</li>
          <li>✓ Ads on free pages later (optional freemium)</li>
        </ul>
        <Link
          href="/tools/merge"
          className="mt-8 inline-flex rounded-lg bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-[var(--ink)] transition hover:brightness-95"
        >
          Try Merge free
        </Link>
      </div>

      <div className="mt-12">
        <h2 className="font-[family-name:var(--font-display)] text-2xl text-[var(--ink)]">
          Tools in this MVP
        </h2>
        <ul className="mt-4 space-y-3">
          {TOOLS.map((tool) => (
            <li key={tool.id}>
              <Link
                href={tool.href}
                className="block rounded-xl border border-[var(--ink)]/10 bg-white/50 px-4 py-3 transition hover:border-[var(--ink)]/25"
              >
                <span className="font-medium text-[var(--ink)]">{tool.name}</span>
                <span className="mt-0.5 block text-sm text-[var(--muted)]">{tool.tagline}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
