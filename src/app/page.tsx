import Link from "next/link";
import { ArrowRight, Lock, Shield, Zap } from "lucide-react";
import { TOOLS } from "@/lib/folioCatalog";

export default function HomePage() {
  return (
    <div>
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "linear-gradient(rgba(28,36,28,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(28,36,28,0.04) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
            maskImage: "radial-gradient(ellipse at center, black 20%, transparent 75%)",
          }}
        />

        <div className="relative mx-auto flex min-h-[78vh] max-w-6xl flex-col justify-center px-5 py-20">
          <p className="animate-rise font-[family-name:var(--font-display)] text-5xl tracking-tight text-[var(--ink)] sm:text-7xl md:text-8xl">
            Folio
          </p>
          <h1 className="animate-rise-delay mt-5 max-w-2xl font-[family-name:var(--font-display)] text-3xl leading-tight tracking-tight text-[var(--ink)] sm:text-4xl">
            Edit PDFs in the browser.
          </h1>
          <p className="animate-rise-delay-2 mt-5 max-w-lg text-lg text-[var(--muted)]">
            Add text, draw, highlight, sign and manage pages — then download your finished file.
            Payment comes later; for now the checkout is demo-only.
          </p>
          <div className="animate-rise-delay-2 mt-9 flex flex-wrap gap-3">
            <Link
              href="/editor"
              className="inline-flex items-center gap-2 rounded-lg bg-[var(--ink)] px-5 py-3 text-sm font-semibold text-[var(--paper)] transition hover:bg-[var(--ink-soft)]"
            >
              Open editor
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/tools/merge"
              className="inline-flex items-center gap-2 rounded-lg border border-[var(--ink)]/15 bg-white/50 px-5 py-3 text-sm font-medium text-[var(--ink)] transition hover:bg-white"
            >
              Merge / Split tools
            </Link>
          </div>
        </div>
      </section>

      <section className="border-t border-[var(--ink)]/10 bg-[var(--paper-deep)]/60 py-20">
        <div className="mx-auto max-w-6xl px-5">
          <h2 className="font-[family-name:var(--font-display)] text-3xl text-[var(--ink)]">
            First tools
          </h2>
          <p className="mt-2 max-w-md text-[var(--muted)]">
            MVP ships the jobs people actually pay for. More editors next.
          </p>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {TOOLS.map((tool, i) => (
              <Link
                key={tool.id}
                href={tool.href}
                className="group rounded-2xl border border-[var(--ink)]/10 bg-white/60 p-6 transition hover:-translate-y-0.5 hover:border-[var(--ink)]/25 hover:bg-white"
                style={{ animationDelay: `${i * 0.08}s` }}
              >
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
                  {tool.tagline}
                </p>
                <p className="mt-3 font-[family-name:var(--font-display)] text-2xl text-[var(--ink)]">
                  {tool.name}
                </p>
                <p className="mt-2 text-sm text-[var(--muted)]">{tool.description}</p>
                <span className="mt-5 inline-flex items-center gap-1 text-sm font-medium text-[var(--ink)] opacity-70 transition group-hover:opacity-100">
                  Open tool <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="mx-auto grid max-w-6xl gap-8 px-5 md:grid-cols-3">
          {[
            {
              icon: Shield,
              title: "Private by default",
              text: "Editing runs in your browser. Files don’t need a server for the MVP tools.",
            },
            {
              icon: Zap,
              title: "Done → download",
              text: "Pick a payment method in the demo checkout, tap Pay, and get your edited PDF instantly.",
            },
            {
              icon: Lock,
              title: "Payment later",
              text: "Real Stripe / Apple Pay comes when you’re ready. For now checkout is free demo mode.",
            },
          ].map((item) => (
            <div key={item.title}>
              <item.icon className="h-6 w-6 text-[var(--ink)]" strokeWidth={1.5} />
              <h3 className="mt-4 font-[family-name:var(--font-display)] text-xl text-[var(--ink)]">
                {item.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">{item.text}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
