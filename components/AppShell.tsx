"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BRAND, whatsappLink } from "@/lib/brand";
import { useStore } from "@/lib/store";
import { useTheme } from "@/lib/theme";
import { Icon } from "./icons";

const NAV = [
  { href: "/studio", label: "Studio", icon: Icon.aperture },
  { href: "/collections", label: "Collections", icon: Icon.folder },
  { href: "/wallet", label: "Wallet", icon: Icon.wallet },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { credits, ready } = useStore();
  const { resolved, setTheme } = useTheme();
  const active = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <div className="min-h-dvh pb-20 md:pb-0">
      <header className="sticky top-0 z-30 border-b border-line bg-bg/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-2 px-4 md:px-6">
          <Link href="/studio" className="mr-4 flex items-center gap-2">
            <Icon.logo className="size-6 text-light" />
            <span className="font-head text-lg font-bold tracking-tight">{BRAND.name}</span>
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {NAV.map(({ href, label, icon: I }) => (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${active(href) ? "bg-raised text-text" : "text-dim hover:text-text"}`}
              >
                <I className="size-4" /> {label}
              </Link>
            ))}
          </nav>
          <Link href="/wallet" className="ml-auto flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-sm" title="Photos you can download">
            <span className="size-2 rounded-full bg-light" />
            <span className="font-semibold tabular-nums">{ready ? credits : "–"}</span>
            <span className="text-dim">photos left</span>
          </Link>
          <button
            onClick={() => setTheme(resolved === "dark" ? "light" : "dark")}
            className="rounded-lg p-2 text-dim hover:text-text"
            aria-label={resolved === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            title={resolved === "dark" ? "Light mode" : "Dark mode"}
          >
            {resolved === "dark" ? <Icon.sun className="size-5" /> : <Icon.moon className="size-5" />}
          </button>
          <a href={whatsappLink()} target="_blank" rel="noreferrer" className="hidden rounded-lg p-2 text-dim hover:text-text sm:block" aria-label="Help on WhatsApp">
            <Icon.help className="size-5" />
          </a>
          <Link href="/settings" className={`rounded-lg p-2 hover:text-text ${active("/settings") ? "text-text" : "text-dim"}`} aria-label="Settings">
            <Icon.gear className="size-5" />
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 md:px-6">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-3 border-t border-line bg-panel md:hidden">
        {NAV.map(({ href, label, icon: I }) => (
          <Link key={href} href={href} className={`flex flex-col items-center gap-1 py-2.5 text-[11px] ${active(href) ? "text-light" : "text-dim"}`}>
            <I className="size-5" />
            {label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
