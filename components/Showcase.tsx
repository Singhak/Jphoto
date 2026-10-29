"use client";

import { useEffect, useState } from "react";
import { BRAND } from "@/lib/brand";
import { pieceLabel } from "@/lib/catalog";
import { type PieceType, STYLES } from "@/lib/pipeline/presets";
import ORIGINALS from "@/lib/sample-originals.json";
import SAMPLES from "@/lib/samples.json";
import { CompareSlider } from "./CompareSlider";
import { Icon } from "./icons";

const samples = SAMPLES as Record<string, Partial<Record<PieceType, string>>>;
const originals = ORIGINALS as Partial<Record<PieceType, string>>;

/** Model looks first: they are the biggest change from a phone photo. */
const ORDER = [...STYLES.filter((s) => s.kind === "model"), ...STYLES.filter((s) => s.kind === "product")];

/** The sample piece with the most finished looks, from scripts/make-samples.ts. */
function pickPiece() {
  let best: { piece: PieceType; before: string; looks: { id: string; label: string; src: string }[] } | null = null;
  for (const [piece, before] of Object.entries(originals) as [PieceType, string][]) {
    const looks = ORDER.filter((s) => samples[s.id]?.[piece]).map((s) => ({ id: s.id, label: s.label, src: samples[s.id][piece]! }));
    if (looks.length && (!best || looks.length > best.looks.length)) best = { piece, before, looks };
  }
  return best;
}

const SHOWN = pickPiece();
export const hasShowcase = SHOWN !== null;

/**
 * One real phone photo against every look made from it. Renders nothing until samples exist (npm run samples).
 */
export function Showcase() {
  const [look, setLook] = useState(0);

  // Load every look up front so switching is instant.
  useEffect(() => {
    SHOWN?.looks.forEach((l) => (new Image().src = l.src));
  }, []);

  if (!SHOWN) return null;
  const current = SHOWN.looks[look];

  return (
    <section className="panel w-full p-4 sm:p-6">
      <p className="text-sm text-dim">
        One phone photo · <span className="text-text">{SHOWN.looks.length > 1 ? `${SHOWN.looks.length} looks` : pieceLabel(SHOWN.piece)}</span>
      </p>
      <CompareSlider before={SHOWN.before} after={current.src} beforeLabel="Phone photo" afterLabel={`${BRAND.name} photo`} hint className="mt-3 aspect-[4/5]" />

      {SHOWN.looks.length > 1 && (
        <div className="-mx-1 mt-3 flex gap-1.5 overflow-x-auto px-1 pb-1" role="tablist" aria-label="Looks">
          {SHOWN.looks.map((l, i) => (
            <button
              key={l.id}
              role="tab"
              aria-selected={i === look}
              onClick={() => setLook(i)}
              className={`flex shrink-0 items-center gap-2 rounded-full border py-1 pr-3 pl-1 text-xs transition ${i === look ? "border-light bg-light/10 font-semibold text-text" : "border-line text-dim hover:text-text"}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={l.src} alt="" className="size-7 rounded-full object-cover" />
              {l.label}
            </button>
          ))}
        </div>
      )}

      <p className="mt-3 text-sm text-dim">Drag the line to compare. Your own pieces can look like this.</p>
      <p className="mt-1.5 flex items-center gap-1.5 text-xs text-ok">
        <Icon.shield className="size-4 shrink-0" /> The piece is never redrawn. Every photo is checked against yours.
      </p>
    </section>
  );
}
