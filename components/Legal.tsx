import { BRAND } from "@/lib/brand";

/** Plain, readable layout for the policy pages. */
export function LegalPage({ title, intro, children }: { title: string; intro?: string; children: React.ReactNode }) {
  return (
    <article className="mx-auto max-w-3xl px-4 py-10 md:px-6 md:py-14">
      <h1 className="font-head text-3xl font-bold tracking-tight md:text-4xl">{title}</h1>
      <p className="mt-2 text-sm text-dim">Last updated {BRAND.legal.updated}</p>
      {intro && <p className="mt-6 text-dim">{intro}</p>}
      <div className="mt-8 space-y-8">{children}</div>
    </article>
  );
}

export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="font-head text-xl font-bold">{title}</h2>
      <div className="mt-2 space-y-3 leading-relaxed text-dim [&_li]:ml-5 [&_li]:list-disc [&_strong]:text-text">{children}</div>
    </section>
  );
}
