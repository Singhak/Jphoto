"use client";

import { useState } from "react";
import { Icon } from "@/components/icons";
import { inr, TOP_UPS } from "@/lib/catalog";
import { useStore } from "@/lib/store";

const FREE = ["Previews and redos", "Photos that fail our checks", "Downloading a photo again"];

export default function WalletPage() {
  const { credits, ledger, addCredits, ready } = useStore();
  const [choice, setChoice] = useState(1);
  const [done, setDone] = useState<number | null>(null);
  const pack = TOP_UPS[choice];
  const total = pack.photos * pack.perPhoto;
  const saving = (TOP_UPS[0].perPhoto - pack.perPhoto) * pack.photos;

  const pay = () => {
    // TODO: create a Cashfree order on the server, open Cashfree checkout, and add credits from the payment webhook.
    addCredits(pack.photos, "top-up", `Top-up of ${pack.photos} photos (test mode)`);
    setDone(pack.photos);
  };

  return (
    <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[1fr_1.3fr]">
      <div className="space-y-4">
        <div className="panel p-6">
          <p className="text-sm text-dim">You can download</p>
          <p className="mt-1 font-head text-6xl font-bold tabular-nums">{ready ? credits : "–"}</p>
          <p className="text-sm text-dim">more photos</p>
        </div>
        <div className="panel p-5">
          <p className="text-sm font-semibold">Never costs a photo</p>
          <ul className="mt-2 space-y-1.5">
            {FREE.map((f) => (
              <li key={f} className="flex items-center gap-2 text-sm text-dim"><Icon.check className="size-4 text-ok" /> {f}</li>
            ))}
          </ul>
        </div>
        <div className="panel p-5">
          <p className="mb-2 text-sm font-semibold">Activity</p>
          <div className="max-h-72 divide-y divide-line overflow-y-auto">
            {ledger.map((e, i) => (
              <div key={i} className="flex items-center justify-between py-2 text-sm">
                <div>
                  <p>{e.note}</p>
                  <p className="text-xs text-dim">{new Date(e.at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</p>
                </div>
                <span className={`font-semibold tabular-nums ${e.credits > 0 ? "text-ok" : "text-dim"}`}>{e.credits > 0 ? `+${e.credits}` : e.credits}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="panel h-fit p-6">
        <h1 className="font-head text-2xl font-bold">Top up</h1>
        <p className="mt-1 text-sm text-dim">Buy photos in any amount. The more you take, the less each one costs. They never expire.</p>

        <div className="mt-6 grid grid-cols-5 gap-1.5">
          {TOP_UPS.map((t, i) => (
            <button
              key={t.photos}
              onClick={() => {
                setChoice(i);
                setDone(null);
              }}
              className={`rounded-lg border py-3 text-center transition ${i === choice ? "border-light bg-light/10" : "border-line hover:border-dim"}`}
            >
              <span className="block font-head text-lg font-bold tabular-nums">{t.photos}</span>
              <span className="text-[10px] text-dim">photos</span>
            </button>
          ))}
        </div>

        {/* Per-photo price falling as the pack grows. */}
        <div className="mt-6 flex h-20 items-end gap-1.5">
          {TOP_UPS.map((t, i) => (
            <div key={t.photos} className="flex flex-1 flex-col items-center gap-1">
              <span className={`text-[11px] tabular-nums ${i === choice ? "text-light" : "text-dim"}`}>{inr(t.perPhoto)}</span>
              <div className={`w-full rounded-t ${i === choice ? "bg-light" : "bg-raised"}`} style={{ height: `${(t.perPhoto / TOP_UPS[0].perPhoto) * 52}px` }} />
            </div>
          ))}
        </div>
        <p className="mt-1 text-center text-[11px] text-dim">price per photo</p>

        <div className="mt-6 flex items-end justify-between border-t border-line pt-4">
          <div>
            <p className="text-sm text-dim">{pack.photos} photos × {inr(pack.perPhoto)}</p>
            {saving > 0 && <p className="text-xs text-ok">You save {inr(saving)}</p>}
          </div>
          <p className="font-head text-3xl font-bold tabular-nums">{inr(total)}</p>
        </div>
        <button onClick={pay} className="btn-light mt-4 w-full py-3">Pay {inr(total)}</button>
        <p className="mt-2 text-center text-xs text-dim">UPI, cards and netbanking via Cashfree · GST invoice by email</p>
        {done && (
          <p className="mt-4 rounded-lg bg-ok/10 p-3 text-sm text-ok">
            {done} photos added. Test mode: no payment was taken.
          </p>
        )}
      </div>
    </div>
  );
}
