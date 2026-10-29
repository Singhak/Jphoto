"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icons";
import { inr, mobileDigits, TOP_UPS } from "@/lib/catalog";
import { useStore } from "@/lib/store";

const FREE = ["Previews and redos", "Photos that fail our checks", "Downloading a photo again"];

type Notice = { tone: "ok" | "bad" | "dim"; text: string } | null;

export default function WalletPage() {
  const { credits, ledger, testTopUp, buy, verifyPayment, update, phone, paymentsLive, ready } = useStore();
  const [choice, setChoice] = useState(1);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const [mobile, setMobile] = useState("");
  const pack = TOP_UPS[choice];
  const total = pack.photos * pack.perPhoto;
  const saving = (TOP_UPS[0].perPhoto - pack.perPhoto) * pack.photos;
  const needsMobile = paymentsLive && !mobileDigits(phone);

  // Back from Cashfree checkout: /wallet?order=… Confirm it once, then tidy the address bar.
  const checked = useRef(false);
  useEffect(() => {
    const orderId = new URLSearchParams(window.location.search).get("order");
    if (!ready || !orderId || checked.current) return;
    checked.current = true;
    window.history.replaceState(null, "", "/wallet");
    setNotice({ tone: "dim", text: "Checking your payment…" });
    verifyPayment(orderId)
      .then((state) =>
        setNotice(
          state === "paid"
            ? { tone: "ok", text: "Payment received. Your photos have been added." }
            : state === "failed"
              ? { tone: "bad", text: "The payment didn't go through, and no photos were added. If money left your account, it returns automatically within 5–7 working days." }
              : { tone: "dim", text: "Your bank is still confirming the payment. Photos are added as soon as it does; refresh this page in a few minutes." },
        ),
      )
      .catch((err) => setNotice({ tone: "bad", text: (err as Error).message }));
  }, [ready, verifyPayment]);

  const pay = async () => {
    setNotice(null);
    setBusy(true);
    try {
      if (!paymentsLive) {
        await testTopUp(pack.photos);
        setNotice({ tone: "ok", text: `${pack.photos} photos added. Test mode: no payment was taken.` });
        return;
      }
      if (needsMobile) {
        const digits = mobileDigits(mobile);
        if (!digits) throw new Error("Enter a 10-digit mobile number.");
        await update({ phone: digits });
      }
      await buy(pack.photos);
      // On success the page has already left for Cashfree.
    } catch (err) {
      setNotice({ tone: "bad", text: (err as Error).message });
    } finally {
      setBusy(false);
    }
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
              <div key={`${e.at}-${i}`} className="flex items-center justify-between py-2 text-sm">
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
        <p className="mt-1 text-sm text-dim">The more photos you take, the less each one costs. They never expire.</p>

        <div className="mt-6 grid gap-1.5" style={{ gridTemplateColumns: `repeat(${TOP_UPS.length}, minmax(0, 1fr))` }}>
          {TOP_UPS.map((t, i) => (
            <button
              key={t.photos}
              onClick={() => {
                setChoice(i);
                setNotice(null);
              }}
              className={`rounded-lg border py-3 text-center transition ${i === choice ? "border-light bg-light/10" : "border-line hover:border-dim"}`}
            >
              <span className="block font-head text-lg font-bold tabular-nums">{t.photos}</span>
              <span className="text-[11px] text-dim">photos</span>
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

        {needsMobile && (
          <label className="mt-4 block">
            <span className="mb-1 block text-sm">Mobile number</span>
            <input className="field" inputMode="tel" value={mobile} onChange={(e) => setMobile(e.target.value)} placeholder="98765 43210" />
            <span className="mt-1 block text-xs text-dim">Cashfree sends the payment receipt to it. We never share it.</span>
          </label>
        )}

        <button onClick={pay} disabled={busy || !ready} className="btn-light mt-4 w-full py-3">
          {busy ? "Opening payment…" : `Pay ${inr(total)}`}
        </button>
        <p className="mt-2 text-center text-xs text-dim">
          {paymentsLive ? "UPI, cards and netbanking via Cashfree · Price includes all taxes" : "Test mode: photos are added free, no payment is taken"}
        </p>
        {notice && (
          <p className={`mt-4 rounded-lg p-3 text-sm ${notice.tone === "ok" ? "bg-ok/10 text-ok" : notice.tone === "bad" ? "bg-bad/10 text-bad" : "bg-raised text-dim"}`}>{notice.text}</p>
        )}
      </div>
    </div>
  );
}
