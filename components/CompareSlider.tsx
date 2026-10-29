"use client";

import { useState } from "react";

/** Before/after with a draggable divider. Works with touch and keyboard through a native range input. */
export function CompareSlider({ before, after, beforeLabel = "Your photo", afterLabel = "Catalogue" }: { before: string; after: string; beforeLabel?: string; afterLabel?: string }) {
  const [pos, setPos] = useState(50);
  return (
    <div className="relative aspect-[4/5] w-full overflow-hidden rounded-lg bg-raised select-none">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={after} alt={afterLabel} className="absolute inset-0 size-full object-cover" />
      <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={before} alt={beforeLabel} className="size-full object-cover" />
      </div>
      <div className="pointer-events-none absolute inset-y-0 w-px bg-light" style={{ left: `${pos}%` }}>
        <span className="absolute top-1/2 left-1/2 h-10 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-light" />
      </div>
      <span className="absolute bottom-2 left-2 rounded bg-black/60 px-2 py-0.5 text-[11px] text-white">{beforeLabel}</span>
      <span className="absolute right-2 bottom-2 rounded bg-black/60 px-2 py-0.5 text-[11px] text-white">{afterLabel}</span>
      <input
        type="range"
        min={0}
        max={100}
        value={pos}
        onChange={(e) => setPos(Number(e.target.value))}
        aria-label="Compare your photo with the catalogue photo"
        className="absolute inset-0 size-full cursor-ew-resize opacity-0"
      />
    </div>
  );
}
