import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";

type ToolShellProps = {
  title: string;
  description: string;
  children: ReactNode;
};

export function ToolShell({ title, description, children }: ToolShellProps) {
  return (
    <div className="mx-auto max-w-3xl px-5 py-12">
      <Link
        href="/"
        className="mb-8 inline-flex items-center gap-1.5 text-sm text-[var(--muted)] transition hover:text-[var(--ink)]"
      >
        <ArrowLeft className="h-4 w-4" />
        All tools
      </Link>
      <h1 className="font-[family-name:var(--font-display)] text-4xl tracking-tight text-[var(--ink)] sm:text-5xl">
        {title}
      </h1>
      <p className="mt-3 max-w-xl text-base text-[var(--muted)]">{description}</p>
      <div className="mt-10 space-y-6">{children}</div>
    </div>
  );
}
