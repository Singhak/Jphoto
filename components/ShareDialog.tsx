"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { pieceLabel } from "@/lib/catalog";
import { FRAMES, loadPhoto, renderFrame, shareOrDownload, toFile } from "@/lib/share-frames";
import { type Creation, useStore } from "@/lib/store";
import { Icon } from "./icons";

const canShareFiles = () => typeof navigator !== "undefined" && Boolean(navigator.canShare?.({ files: [new File([""], "x.jpg", { type: "image/jpeg" })] }));

const toUrl = (canvas: HTMLCanvasElement) =>
  new Promise<string>((resolve, reject) => canvas.toBlob((b) => (b ? resolve(URL.createObjectURL(b)) : reject(new Error("Couldn't draw it."))), "image/jpeg", 0.8));

/** Pick a frame for one downloaded photo and send it to WhatsApp or Instagram with the shop's name on it. */
export function ShareDialog({ item, onClose }: { item: Creation; onClose: () => void }) {
  const { shopName, phone } = useStore();
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [frameId, setFrameId] = useState(FRAMES[0].id);
  const [title, setTitle] = useState(() => pieceLabel(item.piece));
  const [detail, setDetail] = useState("");
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const share = canShareFiles();
  const text = { title: title.trim(), detail: detail.trim(), code: "", shopName, phone };

  useEffect(() => {
    loadPhoto(item.id).then(setImg, () => setError("Couldn’t load this photo. Check your internet and try again."));
  }, [item.id]);

  // One small picture of each frame, drawn once with the starting text.
  useEffect(() => {
    if (!img) return;
    let urls: Record<string, string> = {};
    let gone = false;
    (async () => {
      for (const f of FRAMES) {
        const url = await toUrl(await renderFrame(f.id, img, { title: pieceLabel(item.piece), detail: "", code: "", shopName, phone }));
        if (gone) return URL.revokeObjectURL(url);
        urls = { ...urls, [f.id]: url };
        setThumbs(urls);
      }
    })().catch(() => {});
    return () => {
      gone = true;
      Object.values(urls).forEach(URL.revokeObjectURL);
    };
  }, [img, item.piece, shopName, phone]);

  // The big preview follows the text as it's typed, a moment after the last key.
  const key = JSON.stringify([frameId, text]);
  useEffect(() => {
    if (!img) return;
    let url = "";
    const timer = setTimeout(async () => {
      const [id, t] = JSON.parse(key);
      url = await toUrl(await renderFrame(id, img, t));
      setPreview(url);
    }, 250);
    return () => {
      clearTimeout(timer);
      // Freed once the next preview has replaced it on screen.
      if (url) setTimeout(() => URL.revokeObjectURL(url), 1000);
    };
  }, [img, key]);

  const frame = FRAMES.find((f) => f.id === frameId)!;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/80 sm:items-center sm:p-4" onClick={(e) => {
      // Stops the photo viewer underneath from closing too.
      e.stopPropagation();
      onClose();
    }}>
      <div className="max-h-[94dvh] w-full max-w-lg overflow-y-auto rounded-t-xl bg-panel p-4 sm:rounded-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-semibold">Share with your shop frame</p>
          <button onClick={onClose} aria-label="Close" className="-m-2 p-2 text-dim hover:text-text"><Icon.x className="size-5" /></button>
        </div>

        <div className="flex h-[42dvh] items-center justify-center rounded-lg bg-raised">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt={`${frame.label} preview`} className="max-h-full max-w-full rounded object-contain" />
          ) : (
            <span className="text-sm text-dim">{error || "Drawing…"}</span>
          )}
        </div>

        <div role="radiogroup" aria-label="Frame" className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1">
          {FRAMES.map((f) => (
            <button
              key={f.id}
              role="radio"
              aria-checked={f.id === frameId}
              onClick={() => setFrameId(f.id)}
              className={`w-24 shrink-0 rounded-lg border-2 p-1.5 text-left ${f.id === frameId ? "border-light" : "border-line hover:border-dim"}`}
            >
              <span className="flex h-20 items-center justify-center overflow-hidden rounded bg-raised">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {thumbs[f.id] && <img src={thumbs[f.id]} alt="" className="max-h-full max-w-full object-contain" />}
              </span>
              <span className="mt-1 block text-xs leading-tight font-semibold">{f.label}</span>
            </button>
          ))}
        </div>
        <p className="mt-1 text-xs text-dim">{frame.use}</p>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <input className="field" value={title} maxLength={60} onChange={(e) => setTitle(e.target.value)} aria-label="Design name" placeholder="Design name" />
          <input className="field" value={detail} maxLength={60} onChange={(e) => setDetail(e.target.value)} aria-label="Details" placeholder="22K · 18.4 g" />
        </div>
        {(!shopName || !phone) && (
          <p className="mt-2 text-xs text-dim">
            Add your shop name and number in <Link href="/settings" className="text-light hover:underline">Settings</Link> to put them on the picture.
          </p>
        )}

        <button
          disabled={!img || busy}
          onClick={async () => {
            if (!img) return;
            setBusy(true);
            setError("");
            try {
              await shareOrDownload([await toFile(await renderFrame(frameId, img, text), `${text.title || "jewellery"}-${frameId}`)], text.title);
            } catch (err) {
              setError((err as Error).message || "Couldn’t share it. Try again.");
            } finally {
              setBusy(false);
            }
          }}
          className="btn-light mt-4 w-full"
        >
          {share ? <Icon.whatsapp className="size-4" /> : <Icon.download className="size-4" />}
          {busy ? "Making…" : share ? "Share to WhatsApp, Instagram…" : "Download picture"}
        </button>
        {error && preview && <p className="mt-2 text-center text-sm text-bad">{error}</p>}
      </div>
    </div>
  );
}
