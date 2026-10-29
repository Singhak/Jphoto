"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useLayoutEffect, useRef, useState } from "react";
import { BrochurePages, makeCard } from "@/components/Brochure";
import { UnlockProgress } from "@/components/BrochureOffer";
import { Icon } from "@/components/icons";
import { BROCHURE_UNLOCK, type Brochure, type BrochureItem, PURITIES, TEMPLATES, type TemplateId } from "@/lib/brochure";
import { pieceLabel } from "@/lib/catalog";
import { shareOrDownload } from "@/lib/share-frames";
import { type Creation, useStore } from "@/lib/store";

/** Every downloaded photo of the collection; only the included ones are saved and printed. */
type Row = BrochureItem & { included: boolean };

const blankRow = (c: Creation): Row => ({ creationId: c.id, name: pieceLabel(c.piece), code: "", purity: "", weight: "", featured: false, note: "", included: true });

export default function BrochurePage() {
  return (
    <Suspense>
      <Editor />
    </Suspense>
  );
}

function Editor() {
  const collection = useSearchParams().get("collection") ?? "";
  const store = useStore();
  const { creations, ready, downloadedCount, loadBrochure, saveBrochure } = store;
  const [draft, setDraft] = useState<{ template: TemplateId; title: string; subtitle: string; rows: Row[] } | null>(null);
  const [status, setStatus] = useState<"saved" | "saving" | "unsaved" | "error">("saved");
  const [error, setError] = useState("");
  const [sharing, setSharing] = useState(false);
  const unlocked = downloadedCount >= BROCHURE_UNLOCK;
  const loading = useRef(false);

  const inCollection = creations.filter((c) => c.collection === collection);
  const paid = inCollection.filter((c) => c.downloaded).reverse();
  const unpaid = inCollection.length - paid.length;

  // Saved details first, in their saved order; photos downloaded since then are added at the end.
  useEffect(() => {
    if (!ready || !unlocked || !collection || loading.current) return;
    loading.current = true;
    loadBrochure(collection)
      .then((saved) => {
        const known = new Map(saved?.items.map((i) => [i.creationId, i]));
        const kept = (saved?.items ?? []).filter((i) => paid.some((c) => c.id === i.creationId)).map((i) => ({ ...i, included: true }));
        const added = paid.filter((c) => !known.has(c.id)).map((c) => ({ ...blankRow(c), included: !saved }));
        setDraft({ template: saved?.template ?? "bridal", title: saved?.title ?? collection, subtitle: saved?.subtitle ?? "", rows: [...kept, ...added] });
      })
      .catch((err) => setError((err as Error).message));
  }, [ready, unlocked, collection, loadBrochure, paid]);

  const brochure: Brochure | null = draft && {
    collection,
    template: draft.template,
    title: draft.title,
    subtitle: draft.subtitle,
    items: draft.rows.filter((r) => r.included).map(({ creationId, name, code, purity, weight, featured, note }) => ({ creationId, name, code, purity, weight, featured, note })),
  };

  // Saves a moment after the last change, so typing doesn't send a request per letter.
  const json = brochure && JSON.stringify(brochure);
  const first = useRef(true);
  useEffect(() => {
    if (!json) return;
    if (first.current) {
      first.current = false;
      return;
    }
    setStatus("unsaved");
    const timer = setTimeout(() => {
      setStatus("saving");
      saveBrochure(JSON.parse(json)).then(
        () => setStatus("saved"),
        (err) => {
          setStatus("error");
          setError((err as Error).message);
        },
      );
    }, 900);
    return () => clearTimeout(timer);
  }, [json, saveBrochure]);

  if (!ready) return null;
  if (!collection) return <Empty title="Pick a collection first" text="Open Collections and choose Make brochure on the collection you want." />;
  if (!unlocked) return <Locked count={downloadedCount} />;
  if (paid.length === 0) return <Empty title="No downloaded photos here yet" text={`Download photos from “${collection}” to put them in a brochure.`} />;
  if (!draft || !brochure) return error ? <Empty title="Couldn’t open the brochure" text={error} /> : null;

  const setRow = (id: string, patch: Partial<Row>) => setDraft({ ...draft, rows: draft.rows.map((r) => (r.creationId === id ? { ...r, ...patch } : r)) });
  const move = (i: number, by: number) => {
    const rows = [...draft.rows];
    const j = i + by;
    if (j < 0 || j >= rows.length) return;
    [rows[i], rows[j]] = [rows[j], rows[i]];
    setDraft({ ...draft, rows });
  };

  const shareCards = async () => {
    setSharing(true);
    setError("");
    try {
      const files = await Promise.all(brochure.items.map((item) => makeCard(item, brochure, store)));
      await shareOrDownload(files, brochure.title);
    } catch (err) {
      setError((err as Error).message || "Couldn’t make the pictures. Try again.");
    } finally {
      setSharing(false);
    }
  };

  const count = brochure.items.length;
  const missingShop = !store.shopName || !store.phone;

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start print:block">
      <div className="space-y-5 lg:sticky lg:top-20 lg:max-h-[calc(100dvh-6rem)] lg:w-[400px] lg:shrink-0 lg:overflow-y-auto lg:pr-1 print:hidden">
        <div>
          <Link href="/collections" className="-ml-1 inline-flex items-center gap-1 py-1 text-sm text-dim hover:text-text">
            <Icon.back className="size-4" /> Collections
          </Link>
          <div className="mt-1 flex items-baseline gap-3">
            <h1 className="mr-auto font-head text-2xl font-bold tracking-tight">Brochure</h1>
            <span className={`text-xs ${status === "error" ? "text-bad" : "text-dim"}`}>
              {status === "saved" ? "Saved" : status === "error" ? "Not saved" : "Saving…"}
            </span>
          </div>
          <p className="text-sm text-dim">{collection} · {count} of {paid.length} photos</p>
        </div>

        <div className="flex gap-2">
          <button onClick={() => window.print()} disabled={count === 0} className="btn-light flex-1">
            <Icon.download className="size-4" /> Save as PDF
          </button>
          <button onClick={shareCards} disabled={count === 0 || sharing} className="btn-quiet flex-1">
            <Icon.whatsapp className="size-4" /> {sharing ? "Making…" : "WhatsApp pictures"}
          </button>
        </div>
        <p className="-mt-3 text-xs text-dim">For the PDF, choose “Save as PDF” as the printer. WhatsApp pictures make one picture per piece.</p>
        {error && <p className="rounded-lg bg-raised p-2 text-sm text-bad">{error}</p>}

        {missingShop && (
          <p className="rounded-lg border border-line p-3 text-sm text-dim">
            Add your shop name and mobile number in <Link href="/settings" className="text-light hover:underline">Settings</Link> so they print on the brochure.
          </p>
        )}

        <fieldset>
          <legend className="mb-2 text-sm font-semibold">Style</legend>
          <div className="grid grid-cols-3 gap-2">
            {(Object.keys(TEMPLATES) as TemplateId[]).map((id) => {
              const t = TEMPLATES[id];
              const on = draft.template === id;
              return (
                <button
                  key={id}
                  onClick={() => setDraft({ ...draft, template: id })}
                  aria-pressed={on}
                  className={`overflow-hidden rounded-lg border-2 text-left ${on ? "border-light" : "border-line hover:border-dim"}`}
                >
                  <span style={{ background: t.cover.bg }} className="flex h-14 items-end p-2">
                    <span style={{ background: t.cover.accent }} className="h-0.5 w-8" />
                  </span>
                  <span className="block px-2 py-1.5 text-xs font-semibold">{t.label}</span>
                </button>
              );
            })}
          </div>
        </fieldset>

        <label className="block">
          <span className="mb-1 block text-sm">Title</span>
          <input className="field" value={draft.title} maxLength={60} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm">Line under the title</span>
          <input className="field" value={draft.subtitle} maxLength={90} onChange={(e) => setDraft({ ...draft, subtitle: e.target.value })} placeholder="Wedding & festive designs · 2026" />
        </label>

        <div>
          <p className="mb-2 text-sm font-semibold">Photos</p>
          {unpaid > 0 && <p className="mb-2 text-xs text-dim">{unpaid} more photo{unpaid === 1 ? "" : "s"} in this collection can go in once downloaded.</p>}
          <ul className="space-y-2">
            {draft.rows.map((r, i) => (
              <li key={r.creationId} className={`panel p-2.5 ${r.included ? "" : "opacity-60"}`}>
                <div className="flex gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/api/renders/${r.creationId}?full=1`} alt="" className="aspect-[4/5] w-16 shrink-0 rounded object-cover" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex items-center gap-1">
                      <label className="mr-auto flex items-center gap-2 py-1 text-sm">
                        <input type="checkbox" checked={r.included} onChange={(e) => setRow(r.creationId, { included: e.target.checked })} className="size-4 accent-[var(--light)]" />
                        In brochure
                      </label>
                      <button onClick={() => move(i, -1)} disabled={i === 0} className="rounded p-2 text-dim hover:text-text disabled:opacity-30" aria-label="Move up">
                        <Icon.back className="size-4 rotate-90" />
                      </button>
                      <button onClick={() => move(i, 1)} disabled={i === draft.rows.length - 1} className="rounded p-2 text-dim hover:text-text disabled:opacity-30" aria-label="Move down">
                        <Icon.back className="size-4 -rotate-90" />
                      </button>
                    </div>
                    {r.included && (
                      <>
                        <input className="field py-2" value={r.name} maxLength={60} onChange={(e) => setRow(r.creationId, { name: e.target.value })} aria-label="Design name" placeholder="Design name" />
                        <div className="grid grid-cols-3 gap-2">
                          <input className="field px-2 py-2" value={r.code} maxLength={30} onChange={(e) => setRow(r.creationId, { code: e.target.value })} aria-label="Design code" placeholder="Code" />
                          <select className="field px-2 py-2" value={r.purity} onChange={(e) => setRow(r.creationId, { purity: e.target.value as Row["purity"] })} aria-label="Purity">
                            <option value="">Purity</option>
                            {PURITIES.map((p) => <option key={p}>{p}</option>)}
                          </select>
                          <input className="field px-2 py-2" inputMode="decimal" value={r.weight} maxLength={12} onChange={(e) => setRow(r.creationId, { weight: e.target.value })} aria-label="Weight in grams" placeholder="Grams" />
                        </div>
                        <label className="flex items-center gap-2 text-sm">
                          <input type="checkbox" checked={r.featured} onChange={(e) => setRow(r.creationId, { featured: e.target.checked })} className="size-4 accent-[var(--light)]" />
                          Own page, large
                        </label>
                        {r.featured && (
                          <textarea className="field py-2" rows={2} value={r.note} maxLength={240} onChange={(e) => setRow(r.creationId, { note: e.target.value })} placeholder="A line about this design (optional)" />
                        )}
                      </>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <Preview>
        {count > 0 ? <BrochurePages brochure={brochure} shop={store} /> : <p className="p-10 text-dim">Tick at least one photo to see the brochure.</p>}
      </Preview>
    </div>
  );
}

/** A4 pages shrunk to fit the screen; printed at full size. */
function Preview({ children }: { children: React.ReactNode }) {
  const box = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(0.5);
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    // 210mm is 793.7 CSS px.
    const fit = () => setZoom(Math.min(1, el.clientWidth / 794));
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <div ref={box} className="min-w-0 flex-1">
      <div style={{ "--z": zoom } as React.CSSProperties} className="flex flex-col items-center gap-6 [zoom:var(--z)] print:block print:[zoom:1]">
        {children}
      </div>
    </div>
  );
}

function Locked({ count }: { count: number }) {
  const left = BROCHURE_UNLOCK - count;
  return (
    <div className="mx-auto flex min-h-[60dvh] max-w-sm flex-col items-center justify-center text-center">
      <Icon.brochure className="size-10 text-dim" />
      <h1 className="mt-4 font-head text-2xl font-bold">Brochures unlock at {BROCHURE_UNLOCK} photos</h1>
      <p className="mt-2 text-dim">Download {left} more photo{left === 1 ? "" : "s"} and make a shop brochure from any collection, free.</p>
      <UnlockProgress count={count} className="mt-5 w-full" />
      <Link href="/studio" className="btn-light mt-6">Open the studio</Link>
    </div>
  );
}

function Empty({ title, text }: { title: string; text: string }) {
  return (
    <div className="flex min-h-[60dvh] flex-col items-center justify-center text-center">
      <Icon.brochure className="size-10 text-dim" />
      <h1 className="mt-4 font-head text-2xl font-bold">{title}</h1>
      <p className="mt-2 max-w-sm text-dim">{text}</p>
      <Link href="/collections" className="btn-light mt-6">Go to Collections</Link>
    </div>
  );
}
