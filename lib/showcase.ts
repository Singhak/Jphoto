import { type PieceType, STYLES } from "./pipeline/presets";
import ORIGINALS from "./sample-originals.json";
import SAMPLES from "./samples.json";

/**
 * The sample piece with the most finished looks, from scripts/make-samples.ts.
 * Kept out of components/Showcase.tsx so server pages can read hasShowcase too: a value exported
 * from a "use client" file reaches a server component as a reference, which is always truthy.
 */
const samples = SAMPLES as Record<string, Partial<Record<PieceType, string>>>;
const originals = ORIGINALS as Partial<Record<PieceType, string>>;

/** Model looks first: they are the biggest change from a phone photo. */
const ORDER = [...STYLES.filter((s) => s.kind === "model"), ...STYLES.filter((s) => s.kind === "product")];

function pickPiece() {
  let best: { piece: PieceType; before: string; looks: { id: string; label: string; src: string }[] } | null = null;
  for (const [piece, before] of Object.entries(originals) as [PieceType, string][]) {
    const looks = ORDER.filter((s) => samples[s.id]?.[piece]).map((s) => ({ id: s.id, label: s.label, src: samples[s.id][piece]! }));
    if (looks.length && (!best || looks.length > best.looks.length)) best = { piece, before, looks };
  }
  return best;
}

export const SHOWN = pickPiece();
export const hasShowcase = SHOWN !== null;
