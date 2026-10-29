"use client";

import Link from "next/link";
import { BROCHURE_UNLOCK } from "@/lib/brochure";
import { useStore } from "@/lib/store";
import { Icon } from "./icons";

export const brochureHref = (collection: string) => `/brochure?collection=${encodeURIComponent(collection)}`;

export function UnlockProgress({ count, className = "" }: { count: number; className?: string }) {
  return (
    <div className={className}>
      <div className="mb-1.5 flex justify-between text-xs text-dim">
        <span>Downloaded photos</span>
        <span className="tabular-nums">{Math.min(count, BROCHURE_UNLOCK)} / {BROCHURE_UNLOCK}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-raised">
        <div className="h-full rounded-full bg-light" style={{ width: `${Math.min(100, (count / BROCHURE_UNLOCK) * 100)}%` }} />
      </div>
    </div>
  );
}

/** The free brochure: progress until it unlocks, then a way in. Shown above the collections. */
export function BrochureOffer({ collection }: { collection?: string }) {
  const { downloadedCount, ready } = useStore();
  if (!ready || downloadedCount === 0) return null;
  const unlocked = downloadedCount >= BROCHURE_UNLOCK;
  const left = BROCHURE_UNLOCK - downloadedCount;

  return (
    <div className="panel flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
      <Icon.brochure className="size-8 shrink-0 text-light" />
      <div className="flex-1">
        {unlocked ? (
          <>
            <p className="flex items-center gap-2 font-semibold">
              Shop brochure <span className="rounded-full bg-light/15 px-2 py-0.5 text-[11px] font-semibold text-light">Unlocked</span>
            </p>
            <p className="text-sm text-dim">Turn any collection into a brochure with your shop name, for WhatsApp and print. Free.</p>
          </>
        ) : (
          <>
            <p className="font-semibold">A free shop brochure at {BROCHURE_UNLOCK} photos</p>
            <p className="text-sm text-dim">Download {left} more photo{left === 1 ? "" : "s"} to make brochures from your collections.</p>
            <UnlockProgress count={downloadedCount} className="mt-3 max-w-sm" />
          </>
        )}
      </div>
      {unlocked && collection && (
        <Link href={brochureHref(collection)} className="btn-light">Make brochure</Link>
      )}
    </div>
  );
}
