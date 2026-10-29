"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useLayoutEffect, useRef, useState } from "react";
import { BrochurePages, makeCard } from "@/components/Brochure";
import { UnlockProgress } from "@/components/BrochureOffer";
import { Icon } from "@/components/icons";
import { BROCHURE_UNLOCK, type Brochure, type BrochureItem, cleanGrams, PURITIES, TEMPLATES, type TemplateId } from "@/lib/brochure";
import { pieceLabel } from "@/lib/catalog";
import { shareOrDownload } from "@/lib/share-frames";
import { type Creation, useStore } from "@/lib/store";

/**
 * Two steps: choose the photos, then fill in each piece and pick a style. The PDF is made on the server
 * (lib/brochure-pdf.ts); the pages here are its preview.
 */

type Purity = BrochureItem["purity"];

interface Draft {
  template: TemplateId;
  title: string;
  subtitle: string;
  /** Every downloaded photo of the collection, so details typed for one survive unchoosing it. */
  rows: Record<string, BrochureItem>;
  /** Chosen photos, in page order. */
  chosen: string[];
}

const rowFor = (c: Creation): BrochureItem => ({ creationId: c.id, featured: false, note: "", ...c.details, name: c.details.name || pieceLabel(c.piece) });

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
  const { creations, ready, downloadedCount, loadBrochure, saveBrochure, brochurePdf } = store;
  const [draft, setDraft] = useState<Draft | null>(null);
  const [step, setStep] = useState<"choose" | "details">("choose");
  const [status, setStatus] = useState<"saved" | "saving" | "unsaved" | "error">("saved");
  const [error, setError] = useState("");
  const [making, setMaking] = useState<"pdf" | "cards" | null>(null);
  const unlocked = downloadedCount >= BROCHURE_UNLOCK;
  const loading = useRef(false);

  const inCollection = creations.filter((c) => c.collection === collection);
  const paid = inCollection.filter((c) => c.downloaded).reverse();
  const unpaid = inCollection.length - paid.length;

  // A saved brochure opens on its details; a new one starts by choosing photos.
  useEffect(() => {
    if (!ready || !unlocked || !collection || loading.current) return;
    loading.current = true;
    loadBrochure(collection)
      .then((saved) => {
        const rows = Object.fromEntries(paid.map((c) => [c.id, rowFor(c)]));
        for (const item of saved?.items ?? []) if (rows[item.creationId]) rows[item.creationId] = item;
        const chosen = (saved?.items ?? []).map((i) => i.creationId).filter((id) => rows[id]);
        setDraft({ template: saved?.template ?? "bridal", title: saved?.title ?? collection, subtitle: saved?.subtitle ?? "", rows, chosen });
        setStep(chosen.length ? "details" : "choose");
      })
      .catch((err) => setError((err as Error).message));
  }, [ready, unlocked, collection, loadBrochure, paid]);

  const brochure: Brochure | null = draft && {
    collection,
    template: draft.template,
    title: draft.title,
    subtitle: draft.subtitle,
    items: draft.chosen.map((id) => draft.rows[id]),
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
  if (!collection) return <Empty title="Pick a collection first" text="Open Collections and choose Brochure on the collection you want." />;
  if (!unlocked) return <Locked count={downloadedCount} />;
  if (paid.length === 0) return <Empty title="No downloaded photos here yet" text={`Download photos from “${collection}” to put them in a brochure.`} />;
  if (!draft || !brochure) return error ? <Empty title="Couldn’t open the brochure" text={error} /> : null;

  const setRow = (id: string, patch: Partial<BrochureItem>) => setDraft({ ...draft, rows: { ...draft.rows, [id]: { ...draft.rows[id], ...patch } } });
  const toggle = (id: string) =>
    setDraft({ ...draft, chosen: draft.chosen.includes(id) ? draft.chosen.filter((x) => x !== id) : [...draft.chosen, id] });
  const move = (i: number, by: number) => {
    const chosen = [...draft.chosen];
    const j = i + by;
    if (j < 0 || j >= chosen.length) return;
    [chosen[i], chosen[j]] = [chosen[j], chosen[i]];
    setDraft({ ...draft, chosen });
  };
  const purityForAll = (purity: Purity) => {
    const rows = { ...draft.rows };
    for (const id of draft.chosen) rows[id] = { ...rows[id], purity };
    setDraft({ ...draft, rows });
  };

  const makePdf = async () => {
    setMaking("pdf");
    setError("");
    try {
      // The server makes the PDF from what's saved, so save the latest edits first.
      await saveBrochure(brochure);
      setStatus("saved");
      const pdf = await brochurePdf(collection);
      const name = (brochure.title || collection).replace(/[^\w-]+/g, "-").replace(/^-+|-+$/g, "").toLowerCase() || "brochure";
      await shareOrDownload([new File([pdf], `${name}.pdf`, { type: "application/pdf" })], brochure.title);
    } catch (err) {
      setError((err as Error).message || "Couldn’t make the PDF. Try again.");
    } finally {
      setMaking(null);
    }
  };

  const shareCards = async () => {
    setMaking("cards");
    setError("");
    try {
      const files = await Promise.all(brochure.items.map((item) => makeCard(item, brochure, store)));
      await shareOrDownload(files, brochure.title);
    } catch (err) {
      setError((err as Error).message || "Couldn’t make the pictures. Try again.");
    } finally {
      setMaking(null);
    }
  };

  const count = draft.chosen.length;
  const saveNote = <span className={`text-xs ${status === "error" ? "text-bad" : "text-dim"}`}>{status === "saved" ? "Saved" : status === "error" ? "Not saved" : "Saving…"}</span>;

  if (step === "choose") {
    const allChosen = count === paid.length;
    return (
      <div className="space-y-5 pb-24">
        <div>
          <Link href="/collections" className="-ml-1 inline-flex items-center gap-1 py-1 text-sm text-dim hover:text-text">
            <Icon.back className="size-4" /> Collections
          </Link>
          <div className="mt-1 flex flex-wrap items-baseline gap-3">
            <h1 className="font-head text-2xl font-bold tracking-tight">Choose photos for your brochure</h1>
            <span className="text-sm text-dim">Step 1 of 2</span>
          </div>
          <p className="mt-1 text-sm text-dim">
            {collection} · tap photos in the order you want them. {unpaid > 0 && `${unpaid} more can go in once downloaded.`}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={() => setDraft({ ...draft, chosen: allChosen ? [] : [...draft.chosen, ...paid.map((c) => c.id).filter((id) => !draft.chosen.includes(id))] })} className="btn-quiet">
            {allChosen ? "Clear all" : "Choose all"}
          </button>
          {saveNote}
        </div>

        <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 md:grid-cols-5 xl:grid-cols-7">
          {paid.map((c) => {
            const at = draft.chosen.indexOf(c.id);
            return (
              <button
                key={c.id}
                onClick={() => toggle(c.id)}
                aria-pressed={at >= 0}
                aria-label={`${draft.rows[c.id].name}${at >= 0 ? `, chosen ${at + 1}` : ""}`}
                className={`relative overflow-hidden rounded-lg bg-raised ring-2 transition ${at >= 0 ? "ring-light" : "ring-transparent"}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/api/renders/${c.id}`} alt="" loading="lazy" className={`aspect-[4/5] w-full object-cover ${at >= 0 ? "" : "opacity-80"}`} />
                <span
                  className={`absolute top-1.5 left-1.5 flex size-7 items-center justify-center rounded-md border-2 text-xs font-bold ${at >= 0 ? "border-light bg-light text-light-ink" : "border-white/70 bg-black/30"}`}
                >
                  {at >= 0 ? at + 1 : ""}
                </span>
              </button>
            );
          })}
        </div>

        <div className="fixed inset-x-0 bottom-16 z-40 px-4 md:bottom-6">
          <div className="mx-auto flex max-w-xl items-center gap-3 rounded-xl border border-line bg-raised p-3 shadow-2xl shadow-black/50">
            <p className="text-sm">
              <span className="font-semibold">{count} chosen</span>
              <span className="text-dim"> · {count === 0 ? "tap photos to add them" : `about ${Math.ceil(count / 6) + 2} pages`}</span>
            </p>
            <button onClick={() => setStep("details")} disabled={count === 0} className="btn-light ml-auto">
              Next: details <Icon.arrow className="size-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
      <div className="space-y-5 lg:sticky lg:top-20 lg:max-h-[calc(100dvh-6rem)] lg:w-[420px] lg:shrink-0 lg:overflow-y-auto lg:pr-1">
        <div>
          <button onClick={() => setStep("choose")} className="-ml-1 inline-flex items-center gap-1 py-1 text-sm text-dim hover:text-text">
            <Icon.back className="size-4" /> Change photos
          </button>
          <div className="mt-1 flex items-baseline gap-3">
            <h1 className="mr-auto font-head text-2xl font-bold tracking-tight">Details and style</h1>
            {saveNote}
          </div>
          <p className="text-sm text-dim">{collection} · {count} photo{count === 1 ? "" : "s"} · Step 2 of 2</p>
        </div>

        <div className="flex gap-2">
          <button onClick={makePdf} disabled={count === 0 || making !== null} className="btn-light flex-1">
            <Icon.download className="size-4" /> {making === "pdf" ? "Making PDF…" : "Make PDF"}
          </button>
          <button onClick={shareCards} disabled={count === 0 || making !== null} className="btn-quiet flex-1">
            <Icon.whatsapp className="size-4" /> {making === "cards" ? "Making…" : "WhatsApp pictures"}
          </button>
        </div>
        <p className="-mt-3 text-xs text-dim">The PDF is sized for WhatsApp and prints sharp on A4. WhatsApp pictures make one picture per piece.</p>
        {error && <p className="rounded-lg bg-raised p-2 text-sm text-bad">{error}</p>}

        {(!store.shopName || !store.phone) && (
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
          <div className="mb-1 flex items-center gap-2">
            <p className="mr-auto text-sm font-semibold">Each piece</p>
            <select className="field w-auto px-2 py-1.5 text-xs" value="" onChange={(e) => purityForAll(e.target.value as Purity)} aria-label="Set purity for every piece">
              <option value="" disabled>Same purity for all…</option>
              {PURITIES.map((p) => <option key={p}>{p}</option>)}
            </select>
          </div>
          <p className="mb-2 text-xs text-dim">Weight in grams, as on your tag. It prints as “approx. 18.4 g”. Leave anything blank to keep it off.</p>
          <ul className="space-y-2">
            {draft.chosen.map((id, i) => {
              const r = draft.rows[id];
              return (
                <li key={id} className="panel p-2.5">
                  <div className="flex gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`/api/renders/${id}`} alt="" className="aspect-[4/5] w-16 shrink-0 rounded object-cover" />
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex items-center gap-1">
                        <input className="field mr-1 py-2" value={r.name} maxLength={60} onChange={(e) => setRow(id, { name: e.target.value })} aria-label="Design name" placeholder="Design name" />
                        <button onClick={() => move(i, -1)} disabled={i === 0} className="rounded p-2 text-dim hover:text-text disabled:opacity-30" aria-label="Move up">
                          <Icon.back className="size-4 rotate-90" />
                        </button>
                        <button onClick={() => move(i, 1)} disabled={i === count - 1} className="rounded p-2 text-dim hover:text-text disabled:opacity-30" aria-label="Move down">
                          <Icon.back className="size-4 -rotate-90" />
                        </button>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <input className="field px-2 py-2" value={r.code} maxLength={30} onChange={(e) => setRow(id, { code: e.target.value })} aria-label="Design code" placeholder="Code" />
                        <select className="field px-2 py-2" value={r.purity} onChange={(e) => setRow(id, { purity: e.target.value as Purity })} aria-label="Purity">
                          <option value="">Purity</option>
                          {PURITIES.map((p) => <option key={p}>{p}</option>)}
                        </select>
                        <label className="relative">
                          <input
                            className="field py-2 pr-6 pl-2"
                            inputMode="decimal"
                            value={r.weight}
                            onChange={(e) => setRow(id, { weight: cleanGrams(e.target.value) })}
                            aria-label="Weight in grams"
                            placeholder="Weight"
                          />
                          <span className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-xs text-dim">g</span>
                        </label>
                      </div>
                      <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={r.featured} onChange={(e) => setRow(id, { featured: e.target.checked })} className="size-4 accent-[var(--light)]" />
                        Own page, large
                      </label>
                      {r.featured && (
                        <textarea className="field py-2" rows={2} value={r.note} maxLength={240} onChange={(e) => setRow(id, { note: e.target.value })} placeholder="A line about this design (optional)" />
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      <Preview>
        <BrochurePages brochure={brochure} shop={store} />
      </Preview>
    </div>
  );
}

/** A4 pages shrunk to fit the screen. */
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
      <div style={{ zoom }} className="flex flex-col items-center gap-6">
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
