"use client";

import Link from "next/link";
import { useState } from "react";
import { BrochureOffer, brochureHref } from "@/components/BrochureOffer";
import { Icon } from "@/components/icons";
import { BROCHURE_UNLOCK } from "@/lib/brochure";
import { PhotoTile, PickedBar, styleLabel, Viewer } from "@/components/Photos";
import { PIECES, pieceLabel } from "@/lib/catalog";
import type { PieceType } from "@/lib/pipeline/presets";
import { type Creation, useStore } from "@/lib/store";

export default function CollectionsPage() {
  const { creations, ready, downloadedCount } = useStore();
  const [piece, setPiece] = useState<PieceType | "all">("all");
  const [picked, setPicked] = useState<string[]>([]);
  const [open, setOpen] = useState<Creation | null>(null);

  const shown = piece === "all" ? creations : creations.filter((c) => c.piece === piece);
  const names = [...new Set(shown.map((c) => c.collection))];
  const usedPieces = PIECES.filter((p) => creations.some((c) => c.piece === p.id));
  const togglePick = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  if (ready && creations.length === 0) {
    return (
      <div className="flex min-h-[60dvh] flex-col items-center justify-center text-center">
        <Icon.folder className="size-10 text-dim" />
        <h1 className="mt-4 font-head text-2xl font-bold">No collections yet</h1>
        <p className="mt-2 max-w-sm text-dim">Photos you make in the studio are saved here, grouped the way you name them.</p>
        <Link href="/studio" className="btn-light mt-6">Open the studio</Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="mr-auto font-head text-3xl font-bold tracking-tight">Collections</h1>
        {usedPieces.length > 1 && (
          <select value={piece} onChange={(e) => setPiece(e.target.value as PieceType | "all")} className="field w-auto py-2" aria-label="Filter by piece">
            <option value="all">All pieces</option>
            {usedPieces.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
        )}
      </div>

      <BrochureOffer collection={names.find((n) => creations.some((c) => c.collection === n && c.downloaded))} />

      {names.map((name) => {
        const items = shown.filter((c) => c.collection === name);
        const ids = items.map((c) => c.id);
        const allPicked = ids.every((id) => picked.includes(id));
        const canBrochure = downloadedCount >= BROCHURE_UNLOCK && items.some((c) => c.downloaded);
        return (
          <section key={name}>
            <div className="mb-3 flex items-baseline gap-3 border-b border-line pb-2">
              <h2 className="font-head text-xl font-bold">{name}</h2>
              <span className="text-sm text-dim">{items.length} photo{items.length === 1 ? "" : "s"}</span>
              {canBrochure && (
                <Link href={brochureHref(name)} className="-my-2 ml-auto flex items-center gap-1.5 py-2 text-sm text-light hover:underline">
                  <Icon.brochure className="size-4" /> Brochure
                </Link>
              )}
              <button
                onClick={() => setPicked((p) => (allPicked ? p.filter((id) => !ids.includes(id)) : [...new Set([...p, ...ids])]))}
                className={`-my-2 py-2 text-sm text-light hover:underline ${canBrochure ? "ml-4" : "ml-auto"}`}
              >
                {allPicked ? "Unpick all" : "Pick all"}
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
              {items.map((c) => (
                <PhotoTile
                  key={c.id}
                  id={c.id}
                  caption={`${pieceLabel(c.piece)} · ${styleLabel(c.styleId)}`}
                  picked={picked.includes(c.id)}
                  onPick={() => togglePick(c.id)}
                  onOpen={() => setOpen(c)}
                  downloaded={c.downloaded}
                />
              ))}
            </div>
          </section>
        );
      })}

      <PickedBar ids={picked} onClear={() => setPicked([])} />
      {open && <Viewer item={open} onClose={() => setOpen(null)} />}
    </div>
  );
}
