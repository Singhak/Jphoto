import Link from "next/link";
import { Icon } from "@/components/icons";
import { BRAND, whatsappLink } from "@/lib/brand";

/** Public pages: the landing page and the legal pages Cashfree needs. No sign-in required. */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-30 border-b border-line bg-bg/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4 md:px-6">
          <Link href="/" className="flex items-center gap-2">
            <Icon.logo className="size-6 text-light" />
            <span className="font-head text-lg font-bold tracking-tight">{BRAND.name}</span>
          </Link>
          <nav className="ml-auto flex items-center gap-1 text-sm">
            <Link href="/#prices" className="hidden rounded-lg px-3 py-2 text-dim hover:text-text sm:block">Prices</Link>
            <Link href="/#questions" className="hidden rounded-lg px-3 py-2 text-dim hover:text-text sm:block">Questions</Link>
            <Link href="/studio" className="btn-light ml-1 px-3.5 py-2">Open studio</Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-line">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 text-sm text-dim sm:grid-cols-[1fr_auto] md:px-6">
          <div>
            <p className="flex items-center gap-2 font-head font-bold text-text">
              <Icon.logo className="size-5 text-light" /> {BRAND.name}
            </p>
            <p className="mt-1">Catalogue photos for jewellers. Your design, never redrawn.</p>
            <p className="mt-3 text-xs">© {new Date().getFullYear()} {BRAND.legal.entity}</p>
          </div>
          <nav className="flex flex-wrap gap-x-5 gap-y-2 sm:justify-end">
            <Link href="/contact" className="hover:text-text">Contact</Link>
            <Link href="/privacy" className="hover:text-text">Privacy</Link>
            <Link href="/terms" className="hover:text-text">Terms</Link>
            <Link href="/refunds" className="hover:text-text">Refunds</Link>
            <a href={whatsappLink()} target="_blank" rel="noreferrer" className="hover:text-text">WhatsApp</a>
          </nav>
        </div>
      </footer>
    </div>
  );
}
