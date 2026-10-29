"use client";

import { useRef, useState } from "react";
import { Icon, PieceIcon } from "@/components/icons";
import { PhotoTile, PickedBar, styleLabel, Viewer } from "@/components/Photos";
import { MODEL_LOOKS_ON, PIECES, pieceLabel, STYLE_LOOKS } from "@/lib/catalog";
import SAMPLES from "@/lib/samples.json";
import { type PieceType, type StylePreset, STYLES, stylesFor } from "@/lib/pipeline/presets";
import { type Creation, useStore } from "@/lib/store";

/** Matches MIN_SHORT_SIDE in the pipeline, so tiny photos are caught before upload. */
const MIN_SHORT_SIDE = 600;

interface Piece {
  key: string;
  file: File;
  url: string;
  type: PieceType | "";
  /** "bad": the photo itself needs retaking. "failed": our side broke; the same photo can be tried again. */
  check: "checking" | "ok" | "bad" | "failed";
  cutoutId?: string;
  notes: string[];
}

interface Shot {
  key: string;
  pieceKey: string;
  styleId: string;
  status: "queued" | "making" | "done" | "rejected" | "error";
  id?: string;
  note?: string;
  /** A daily or per-look limit was hit, so trying again now would fail too. */
  limited?: boolean;
}

const thisMonth = () => new Date().toLocaleDateString("en-IN", { month: "long", year: "numeric" });
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

export default function StudioPage() {
  const { addCreation, creations, credits, ready: accountReady } = useStore();
  const [pieces, setPieces] = useState<Piece[]>([]);
  const [focus, setFocus] = useState<string | null>(null);
  const [looks, setLooks] = useState<string[]>(["studio-white"]);
  const [shots, setShots] = useState<Shot[]>([]);
  const [collection, setCollection] = useState(thisMonth);
  const [picked, setPicked] = useState<string[]>([]);
  const [open, setOpen] = useState<{ item: Creation; original: string } | null>(null);
  const [drag, setDrag] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  // Server work runs one job at a time: the local cutout model is CPU-heavy and the AI APIs rate-limit.
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const enqueue = (job: () => Promise<void>) => (queue.current = queue.current.then(job, job));

  const patchPiece = (key: string, patch: Partial<Piece>) => setPieces((all) => all.map((p) => (p.key === key ? { ...p, ...patch } : p)));
  const patchShot = (key: string, patch: Partial<Shot>) => setShots((all) => all.map((s) => (s.key === key ? { ...s, ...patch } : s)));

  const addFiles = (files: FileList | null) => {
    for (const file of Array.from(files ?? [])) {
      if (!file.type.startsWith("image/")) continue;
      const piece: Piece = { key: crypto.randomUUID(), file, url: URL.createObjectURL(file), type: "", check: "checking", notes: [] };
      setPieces((all) => [...all, piece]);
      const img = new Image();
      img.onload = () => {
        const short = Math.min(img.naturalWidth, img.naturalHeight);
        if (short < MIN_SHORT_SIDE) {
          patchPiece(piece.key, { check: "bad", notes: [`Too small (${short}px). WhatsApp shrinks photos; use the original from your camera.`] });
          return;
        }
        enqueue(() => checkPhoto(piece));
      };
      img.onerror = () => patchPiece(piece.key, { check: "bad", notes: ["Couldn’t open this file. Use a JPG or PNG."] });
      img.src = piece.url;
    }
  };

  const checkPhoto = async (piece: Piece) => {
    patchPiece(piece.key, { check: "checking", notes: [] });
    const form = new FormData();
    form.append("photo", piece.file);
    try {
      const res = await fetch("/api/extract", { method: "POST", body: form });
      const data = await res.json();
      if (res.status >= 500) return patchPiece(piece.key, { check: "failed", notes: ["Our side hiccupped. Your photo is fine."] });
      if (res.status === 429) return patchPiece(piece.key, { check: "failed", notes: [data.error] });
      if (!res.ok) return patchPiece(piece.key, { check: "bad", notes: [data.error] });
      if (data.problems.length) return patchPiece(piece.key, { check: "bad", cutoutId: data.cutoutId, notes: data.problems });
      patchPiece(piece.key, { check: "ok", cutoutId: data.cutoutId, notes: data.warnings });
    } catch {
      patchPiece(piece.key, { check: "failed", notes: ["Connection lost while checking."] });
    }
  };

  const render = (shot: Shot, piece: Piece) =>
    enqueue(async () => {
      patchShot(shot.key, { status: "making", note: undefined });
      try {
        const res = await fetch("/api/render", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cutoutId: piece.cutoutId, piece: piece.type, styleId: shot.styleId, collection: collection.trim() || thisMonth() }),
        });
        const data = await res.json();
        if (res.status === 401) {
          window.location.href = "/login";
          return;
        }
        if (!res.ok) return patchShot(shot.key, { status: "error", note: data.error, limited: Boolean(data.limited) });
        if (!data.accepted) return patchShot(shot.key, { status: "rejected", note: "Failed our checks, so it’s hidden. Not charged." });
        patchShot(shot.key, { status: "done", id: data.id });
        addCreation(data.creation);
      } catch {
        patchShot(shot.key, { status: "error", note: "Connection lost. Not charged." });
      }
    });

  const ready = pieces.filter((p) => p.check === "ok" && p.type);
  const todo = ready.flatMap((p) =>
    looks.filter((l) => stylesFor(p.type as PieceType).some((s) => s.id === l) && !shots.some((s) => s.pieceKey === p.key && s.styleId === l)).map((l) => ({ piece: p, styleId: l })),
  );
  const untagged = pieces.filter((p) => (p.check === "ok" || p.check === "checking") && !p.type).length;
  const checking = pieces.filter((p) => p.check === "checking").length;
  const tagged = [...new Set(pieces.filter((p) => p.type && p.check !== "bad").map((p) => p.type as PieceType))];
  // The piece shown on the look tiles: the one the jeweller tapped, else the first one that passed.
  const preview = pieces.find((p) => p.key === focus && p.cutoutId && p.check === "ok") ?? pieces.find((p) => p.check === "ok" && p.cutoutId);

  const shoot = () => {
    const fresh = todo.map(({ piece, styleId }) => ({ key: `${piece.key}:${styleId}`, pieceKey: piece.key, styleId, status: "queued" as const }));
    setShots((all) => [...all, ...fresh]);
    fresh.forEach((s, i) => render(s, todo[i].piece));
  };

  const toggleLook = (id: string) => setLooks((l) => (l.includes(id) ? l.filter((x) => x !== id) : [...l, id]));
  const togglePick = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const fileField = <input ref={fileInput} type="file" accept="image/*" multiple className="hidden" onChange={(e) => addFiles(e.target.files)} />;

  if (pieces.length === 0) {
    return (
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          addFiles(e.dataTransfer.files);
        }}
        className={`flex min-h-[70dvh] flex-col items-center justify-center rounded-2xl border-2 border-dashed px-4 py-8 text-center sm:px-6 transition-colors ${drag ? "border-light bg-light/5" : "border-line"}`}
      >
        <div className="mb-4 flex -space-x-3 sm:mb-6">
          {(["ring", "necklace", "earring"] as const).map((p, i) => (
            <span key={p} className="flex size-12 items-center justify-center rounded-full border border-line bg-panel sm:size-14" style={{ transform: `rotate(${(i - 1) * 8}deg)` }}>
              <PieceIcon piece={p} className="size-7 text-light sm:size-8" />
            </span>
          ))}
        </div>
        <h1 className="font-head text-3xl font-bold tracking-tight md:text-5xl">Drop your pieces in.</h1>
        <p className="mt-3 max-w-md text-dim">
          One piece per photo. Lying on a cloth, on a stand or held in your fingers is all fine: we cut the piece out. Add the whole tray at once. We check every photo for free before anything is made.
        </p>
        <button onClick={() => fileInput.current?.click()} className="btn-light mt-5 px-6 py-3 sm:mt-6">
          <Icon.plus className="size-4" /> Add photos
        </button>
        <ol className="mt-8 grid w-full max-w-2xl gap-3 text-left text-sm sm:mt-10 sm:grid-cols-3 sm:gap-4">
          {[
            ["Add photos", "Straight from your phone camera. Held or on a stand is fine, but not worn on a hand or neck."],
            ["Pick looks", MODEL_LOOKS_ON ? "Marble, velvet, a bride wearing it. Same looks for the whole batch." : "White, marble, velvet, festive. Same looks for the whole batch."],
            ["Keep the best", "Previews are free. Pay only for the photos you download."],
          ].map(([t, d], i) => (
            <li key={t} className="flex gap-3 sm:panel sm:block sm:p-4">
              <span className="font-head text-xl leading-tight font-bold text-light">{i + 1}</span>
              <div>
                <p className="font-semibold sm:mt-1">{t}</p>
                <p className="text-dim">{d}</p>
              </div>
            </li>
          ))}
        </ol>
        {fileField}
      </div>
    );
  }

  return (
    <div className="grid gap-6 pb-40 md:pb-24 lg:grid-cols-[300px_1fr]">
      {/* Tray: the jeweller's photos, each checked and tagged. */}
      <aside className="space-y-3 lg:sticky lg:top-20 lg:self-start">
        <div className="flex items-center justify-between">
          <h2 className="font-head text-lg font-bold">
            Pieces <span className="text-dim">{pieces.length}</span>
          </h2>
          <button onClick={() => fileInput.current?.click()} className="btn-quiet px-3 py-1.5 text-xs">
            <Icon.plus className="size-3.5" /> Add
          </button>
          {fileField}
        </div>
        <div className="space-y-2 lg:max-h-[calc(100dvh-180px)] lg:overflow-y-auto lg:pr-1">
          {pieces.map((p) => (
            <TrayCard
              key={p.key}
              piece={p}
              focused={preview?.key === p.key}
              onFocus={() => setFocus(p.key)}
              onType={(type) => patchPiece(p.key, { type })}
              onRetry={() => enqueue(() => checkPhoto(p))}
              onRemove={() => setPieces((all) => all.filter((x) => x.key !== p.key))}
            />
          ))}
        </div>
      </aside>

      <section className="min-w-0 space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="font-head text-lg font-bold">Looks</h2>
            <p className="text-xs text-dim">Pick as many as you like. They apply to every piece.</p>
          </div>
          {preview && (
            <p className="flex items-center gap-2 text-xs text-dim">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview.url} alt="" className="size-6 rounded object-cover" />
              Showing {preview.type ? `your ${pieceLabel(preview.type).toLowerCase()}` : "your piece"}
            </p>
          )}
        </div>

        {(MODEL_LOOKS_ON ? (["product", "model"] as const) : (["product"] as const)).map((kind) => (
          <div key={kind}>
            <p className="mb-2 text-sm font-semibold text-dim">{kind === "product" ? "On a surface" : "Worn by a model"}</p>
            <div className="grid grid-cols-3 gap-2 sm:gap-2.5 xl:grid-cols-6">
              {STYLES.filter((s) => s.kind === kind).map((s) => (
                <LookTile
                  key={s.id}
                  style={s}
                  on={looks.includes(s.id)}
                  onToggle={() => toggleLook(s.id)}
                  cutoutId={preview?.cutoutId}
                  fallbackPiece={preview?.type || tagged[0] || "ring"}
                  unsuited={tagged.length > 0 && !tagged.some((t) => stylesFor(t).some((x) => x.id === s.id)) ? tagged : null}
                />
              ))}
            </div>
          </div>
        ))}

        {/* Contact sheet: results grouped by piece. */}
        {pieces
          .filter((p) => shots.some((s) => s.pieceKey === p.key))
          .map((p) => (
            <div key={p.key}>
              <div className="mb-2 flex items-center gap-2 border-t border-line pt-5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.url} alt="" className="size-7 rounded object-cover" />
                <p className="text-sm font-semibold">{p.type ? pieceLabel(p.type) : "Piece"}</p>
              </div>
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-4">
                {shots
                  .filter((s) => s.pieceKey === p.key)
                  .map((s) =>
                    s.status === "done" && s.id ? (
                      <PhotoTile
                        key={s.key}
                        id={s.id}
                        caption={styleLabel(s.styleId)}
                        picked={picked.includes(s.id)}
                        onPick={() => togglePick(s.id!)}
                        onOpen={() => {
                          const item = creations.find((c) => c.id === s.id);
                          if (item) setOpen({ item, original: p.url });
                        }}
                        downloaded={creations.find((c) => c.id === s.id)?.downloaded}
                      />
                    ) : (
                      <PendingTile key={s.key} shot={s} cutoutId={p.cutoutId} onRetry={() => render(s, p)} />
                    ),
                  )}
              </div>
            </div>
          ))}
        {shots.some((s) => s.status === "done") && <p className="text-xs text-dim">Tap the corner of a photo to pick it, then download your picks together.</p>}
      </section>

      {/* Action bar: stays in reach while scrolling through looks and results. */}
      {picked.length === 0 && (
        <div className="fixed inset-x-0 bottom-16 z-30 px-4 md:bottom-6">
          <div className="mx-auto flex max-w-3xl flex-col gap-2 rounded-xl border border-line bg-raised/95 p-3 shadow-2xl shadow-black/50 backdrop-blur sm:flex-row sm:items-center">
            <label className="flex min-w-0 flex-1 items-center gap-2 text-sm">
              <Icon.folder className="size-4 shrink-0 text-dim" />
              <input value={collection} onChange={(e) => setCollection(e.target.value)} className="field border-transparent bg-transparent px-1 py-1" aria-label="Collection name" />
            </label>
            <div className="flex items-center gap-3">
              <div className="min-w-0 flex-1 text-xs text-dim sm:text-right">
                <p>
                  {checking > 0
                    ? `Checking ${plural(checking, "photo")}…`
                    : untagged > 0
                      ? `Say what ${untagged === 1 ? "1 piece is" : `${untagged} pieces are`} first`
                      : todo.length > 0
                        ? `${plural(new Set(todo.map((t) => t.piece.key)).size, "piece")} × ${plural(new Set(todo.map((t) => t.styleId)).size, "look")} · free previews`
                        : looks.length === 0
                          ? "Pick at least one look"
                          : "Pick more looks or add pieces"}
                </p>
                {/* The charge-on-download rule, shown where the jeweller decides. */}
                {accountReady && (
                  <p className="mt-0.5 text-[11px]">
                    You pay only for downloads, 1 photo each · <span className={credits > 0 ? "text-text" : "text-light"}>{credits > 0 ? `${plural(credits, "photo")} left` : "top up before downloading"}</span>
                  </p>
                )}
              </div>
              <button onClick={shoot} disabled={todo.length === 0} className="btn-light shrink-0">
                <Icon.aperture className="size-4" /> {todo.length ? `Make ${plural(todo.length, "photo")}` : "Make photos"}
              </button>
            </div>
          </div>
        </div>
      )}

      <PickedBar ids={picked} onClear={() => setPicked([])} />
      {open && <Viewer item={open.item} original={open.original} onClose={() => setOpen(null)} />}
    </div>
  );
}

function TrayCard({ piece: p, focused, onFocus, onType, onRetry, onRemove }: { piece: Piece; focused: boolean; onFocus: () => void; onType: (t: PieceType) => void; onRetry: () => void; onRemove: () => void }) {
  const status = {
    checking: { text: "Checking photo…", color: "text-dim" },
    ok: { text: p.type ? "Ready" : "Looks good. What is it?", color: p.type ? "text-ok" : "text-light" },
    bad: { text: "Retake this photo", color: "text-bad" },
    failed: { text: "Couldn’t check it", color: "text-light" },
  }[p.check];

  return (
    <div onClick={onFocus} className={`panel flex cursor-pointer gap-3 p-2.5 transition ${p.check === "bad" ? "border-bad/40" : focused ? "border-light/50" : "hover:border-dim"}`}>
      <div className={`relative size-[72px] shrink-0 overflow-hidden rounded-md bg-raised ${p.check === "checking" ? "working" : ""}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={p.url} alt="" className={`size-full object-cover ${p.check === "bad" ? "opacity-50" : ""}`} />
        {p.check === "ok" && (
          <span className="absolute right-1 bottom-1 flex size-5 items-center justify-center rounded-full bg-ok text-bg">
            <Icon.check className="size-3" />
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1 space-y-1.5" onClick={(e) => e.stopPropagation()}>
        <div className="flex gap-1">
          <select
            value={p.type}
            onChange={(e) => onType(e.target.value as PieceType)}
            disabled={p.check === "bad"}
            className={`field py-1.5 text-xs ${!p.type && p.check !== "bad" ? "border-light/60" : ""}`}
            aria-label="What is this piece?"
          >
            <option value="">What is it?</option>
            {PIECES.map((o) => (
              <option key={o.id} value={o.id}>{o.label}</option>
            ))}
          </select>
          <button onClick={onRemove} className="rounded-md px-1.5 text-dim hover:text-text" aria-label="Remove">
            <Icon.x className="size-4" />
          </button>
        </div>
        <p className={`text-xs font-medium ${status.color}`}>{status.text}</p>
        {/* Retake guidance for this piece type, when the photo has problems. */}
        {p.type && (p.check === "bad" || p.notes.length > 0) && <p className="text-[11px] leading-snug text-dim">{PIECES.find((o) => o.id === p.type)?.tip}</p>}
        {p.notes.map((n) => (
          <p key={n} className="text-[11px] leading-snug text-dim">{n}</p>
        ))}
        {p.check === "failed" && (
          <button onClick={onRetry} className="flex items-center gap-1 text-xs font-semibold text-light hover:underline">
            <Icon.refresh className="size-3.5" /> Try again
          </button>
        )}
      </div>
    </div>
  );
}

/** A look, previewed with the jeweller's own cut-out piece once the photo check is done. */
function LookTile({ style, on, onToggle, cutoutId, fallbackPiece, unsuited }: { style: StylePreset; on: boolean; onToggle: () => void; cutoutId?: string; fallbackPiece: PieceType; unsuited: PieceType[] | null }) {
  const look = STYLE_LOOKS[style.id];
  const model = style.kind === "model";
  // A real shot made by scripts/make-samples.ts: this piece type if we have one, else any piece in this look.
  const samples: Partial<Record<PieceType, string>> = (SAMPLES as Record<string, Partial<Record<PieceType, string>>>)[style.id] ?? {};
  const sample = samples[fallbackPiece] ?? Object.values(samples)[0];
  return (
    <button
      onClick={onToggle}
      className={`group flex flex-col overflow-hidden rounded-lg bg-panel text-left ring-2 transition ${on ? "ring-light" : "ring-transparent hover:ring-line"} ${unsuited && !on ? "opacity-40" : ""}`}
    >
      <div className="relative flex aspect-square w-full items-center justify-center overflow-hidden sm:aspect-[4/5]" style={{ background: look?.swatch }}>
        {sample ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={sample} alt={`${style.label} sample`} className="absolute inset-0 size-full object-cover transition-transform group-hover:scale-105" />
        ) : cutoutId ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/api/cutouts/${cutoutId}`}
            alt=""
            className={`object-contain drop-shadow-[0_8px_10px_rgba(0,0,0,0.35)] transition-transform group-hover:scale-105 ${model ? "max-h-[38%] max-w-[42%]" : "max-h-[58%] max-w-[62%]"}`}
          />
        ) : (
          <PieceIcon piece={fallbackPiece} className={`size-1/3 ${look?.dark ? "text-white/45" : "text-black/25"}`} />
        )}
        {model && (
          <span className="absolute bottom-1.5 left-1.5 rounded bg-black/55 px-1.5 py-0.5 text-[10px] font-medium text-white sm:bottom-2 sm:left-2">
            {sample ? "Sample" : (
              <>
                AI model<span className="hidden sm:inline"> · sample soon</span>
              </>
            )}
          </span>
        )}
        <span
          className={`absolute top-2 right-2 flex size-6 items-center justify-center rounded-md border-2 transition ${on ? "border-light bg-light text-light-ink" : "border-white/60 bg-black/20 text-transparent"}`}
        >
          <Icon.check className="size-3.5" />
        </span>
      </div>
      <div className="px-2 py-1.5 sm:px-2.5 sm:py-2">
        <p className="truncate text-xs font-semibold sm:text-sm">{style.label}</p>
        <p className={`line-clamp-2 text-[11px] leading-snug text-dim ${unsuited ? "" : "hidden sm:block"}`}>
          {unsuited ? `Not for ${unsuited.map((t) => pieceLabel(t).toLowerCase()).join(", ")}` : look?.blurb}
        </p>
      </div>
    </button>
  );
}

function PendingTile({ shot: s, cutoutId, onRetry }: { shot: Shot; cutoutId?: string; onRetry: () => void }) {
  const waiting = s.status === "queued" || s.status === "making";
  return (
    <div className="overflow-hidden rounded-lg bg-raised">
      <div
        className={`relative flex aspect-[4/5] flex-col items-center justify-center gap-2 p-3 text-center ${s.status === "making" ? "working" : ""}`}
        style={waiting ? { background: STYLE_LOOKS[s.styleId]?.swatch } : undefined}
      >
        {waiting && cutoutId && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={`/api/cutouts/${cutoutId}`} alt="" className="max-h-[50%] max-w-[55%] object-contain opacity-60 blur-[1px]" />
        )}
        {waiting && (
          <span className="absolute bottom-3 rounded bg-black/60 px-2 py-1 text-xs text-white">{s.status === "making" ? "Making · about a minute" : "In line"}</span>
        )}
        {!waiting && (
          <>
            <p className="text-xs text-dim">{s.note}</p>
            {!s.limited && (
              <button onClick={onRetry} className="btn-quiet px-3 py-1.5 text-xs">
                <Icon.refresh className="size-3.5" /> Try again, free
              </button>
            )}
          </>
        )}
      </div>
      <p className="truncate px-2.5 py-2 text-xs text-dim">{styleLabel(s.styleId)}</p>
    </div>
  );
}
