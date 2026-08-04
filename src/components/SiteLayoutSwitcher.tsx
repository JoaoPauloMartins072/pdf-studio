"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

/** Marketing pages get header/footer; /editor is full-bleed workspace. */
export function SiteLayoutSwitcher({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const bare = pathname?.startsWith("/editor");

  if (bare) {
    return <main className="relative z-10 min-h-screen">{children}</main>;
  }

  return (
    <>
      <SiteHeader />
      <main className="relative z-10 flex-1">{children}</main>
      <SiteFooter />
    </>
  );
}
