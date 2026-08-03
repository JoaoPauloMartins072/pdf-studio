"use client";

import { usePathname } from "next/navigation";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

export function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const bare = pathname?.startsWith("/editor");

  if (bare) {
    return <main className="relative z-10 min-h-screen">{children}</main>;
  }

  return (
    <>
      <Header />
      <main className="relative z-10 flex-1">{children}</main>
      <Footer />
    </>
  );
}
