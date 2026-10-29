"use client";

import Link from "next/link";
import { useState } from "react";
import { pieceLabel } from "@/lib/catalog";
import { STYLES } from "@/lib/pipeline/presets";
import { type Creation, downloadFiles, useStore } from "@/lib/store";
import { CompareSlider } from "./CompareSlider";
import { Icon } from "./icons";
import { ShareDialog } from "./ShareDialog";

export const styleLabel = (id: string) => STYLES.find((s) => s.id === id)?.label ?? id;

/** A finished photo on a contact sheet: tap the corner to pick it, tap the photo to open it. */
export function PhotoTile({ id, caption, picked, onPick, onOpen, downloaded }: { id: string; caption: string; picked: boolean; onPick: () => void; onOpen: () => void; downloaded?: boolean }) {
  return (
    <div className={`group relative overflow-hidden rounded-lg bg-raised ring-2 transition ${picked ? "ring-light" : "ring-transparent"}`}>
      <button onClick={onOpen} className="block w-full">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`/api/renders/${id}`} alt={caption} loading="lazy" className="aspect-[4/5] w-full object-cover" />
      </button>
      <button
        onClick={onPick}
        aria-label={picked ? "Unpick" : "Pick"}
        className="absolute top-0 left-0 flex size-11 items-center justify-center"
      >
        <span className={`flex size-7 items-center justify-center rounded-md border-2 ${picked ? "border-light bg-light text-light-ink" : "border-white/70 bg-black/30 text-transparent group-hover:text-white/60"}`}>
          <Icon.check className="size-4" />
        </span>
      </button>
      {downloaded && <span className="absolute top-2 right-2 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-semibold text-ok">SAVED</span>}
      <p className="truncate px-2.5 py-2 text-xs text-dim">{caption}</p>
    </div>
  );
}

/** Sticky bar for downloading picked photos. Re-downloads are free, so the cost only counts new ones. */
export function PickedBar({ ids, onClear }: { ids: string[]; onClear: () => void }) {
  const { costOf, chargeDownloads, credits } = useStore();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  if (ids.length === 0) return null;
  const cost = costOf(ids);
  const short = cost > credits;

  return (
    <div className="fixed inset-x-0 bottom-16 z-40 px-4 md:bottom-6">
      <div className="mx-auto flex max-w-xl items-center gap-3 rounded-xl border border-line bg-raised p-3 shadow-2xl shadow-black/50">
        <button onClick={onClear} className="-m-1 rounded-md p-2.5 text-dim hover:text-text" aria-label="Clear picks">
          <Icon.x className="size-4" />
        </button>
        <p className="text-sm">
          <span className="font-semibold">{ids.length} picked</span>
          <span className="text-dim"> · {cost === 0 ? "already paid" : `${cost} of your ${credits} photos`}</span>
        </p>
        {short ? (
          <Link href="/wallet" className="btn-light ml-auto">Top up</Link>
        ) : (
          <button
            onClick={async () => {
              setBusy(true);
              const failed = await chargeDownloads(ids);
              setBusy(false);
              setError(failed ?? "");
              if (!failed) {
                downloadFiles(ids);
                onClear();
              }
            }}
            disabled={busy}
            className="btn-light ml-auto"
          >
            <Icon.download className="size-4" /> {busy ? "Saving…" : "Download"}
          </button>
        )}
      </div>
      {error && <p className="mx-auto mt-2 max-w-xl rounded-lg bg-raised p-2 text-center text-sm text-bad">{error}</p>}
    </div>
  );
}

/** Full view of one photo, with before/after when the original is at hand, and a way to flag a bad one. */
export function Viewer({ item, original, onClose }: { item: Creation; original?: string; onClose: () => void }) {
  const { flag, creations } = useStore();
  const current = creations.find((c) => c.id === item.id) ?? item;
  const [flagging, setFlagging] = useState(false);
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const [sharing, setSharing] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 sm:items-center sm:p-4" onClick={onClose}>
      <div className="max-h-[94dvh] w-full max-w-md overflow-y-auto rounded-t-xl bg-panel p-4 sm:rounded-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm">
            <span className="font-semibold">{styleLabel(current.styleId)}</span>
            <span className="text-dim"> · {pieceLabel(current.piece)} · {current.collection}</span>
          </p>
          <button onClick={onClose} aria-label="Close" className="text-dim hover:text-text"><Icon.x className="size-5" /></button>
        </div>
        {original ? (
          <CompareSlider before={original} after={`/api/renders/${current.id}`} />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={`/api/renders/${current.id}`} alt="" className="aspect-[4/5] w-full rounded-lg object-cover" />
        )}
        <p className="mt-3 flex items-center gap-2 text-xs text-ok">
          <Icon.shield className="size-4" /> Checked: the piece matches your photo pixel for pixel.
        </p>
        {current.downloaded ? (
          <button onClick={() => setSharing(true)} className="btn-quiet mt-3 w-full">
            <Icon.whatsapp className="size-4" /> Share with your shop frame
          </button>
        ) : (
          <p className="mt-3 text-xs text-dim">Once downloaded, you can share it in a frame with your shop name: Instagram post, Status, postcard and more.</p>
        )}
        {current.flagged ? (
          <p className="mt-3 rounded-lg bg-raised p-3 text-sm text-dim">Flagged. We’ll compare it with your photo and put the credit back if it’s off, usually within a day.</p>
        ) : current.downloaded && !flagging ? (
          <button onClick={() => setFlagging(true)} className="mt-3 flex items-center gap-1.5 text-sm text-dim hover:text-text">
            <Icon.flag className="size-4" /> Doesn’t look right? Flag it
          </button>
        ) : null}
        {flagging && !current.flagged && (
          <div className="mt-3 space-y-2">
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} className="field" placeholder="What’s different from your piece?" />
            <button
              disabled={note.trim().length < 5 || sending}
              onClick={async () => {
                setSending(true);
                try {
                  await flag(current.id, note.trim());
                  setFlagging(false);
                } catch (err) {
                  alert((err as Error).message);
                } finally {
                  setSending(false);
                }
              }}
              className="btn-light w-full"
            >
              Send for review
            </button>
          </div>
        )}
      </div>
      {sharing && <ShareDialog item={current} onClose={() => setSharing(false)} />}
    </div>
  );
}
