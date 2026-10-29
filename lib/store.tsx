"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Creation, LedgerEntry } from "./account";
import { authClient } from "./auth-client";

/**
 * The signed-in jeweller's account, loaded from the server (lib/account.ts).
 * Nothing here is trusted: credits are checked and charged by the server.
 */

export type { Creation, LedgerEntry };

interface State {
  name: string;
  email: string;
  shopName: string;
  phone: string;
  credits: number;
  creations: Creation[];
  ledger: LedgerEntry[];
  /** True when Cashfree is set up; otherwise top-ups are free test credits. */
  paymentsLive: boolean;
}

const empty: State = { name: "", email: "", shopName: "", phone: "", credits: 0, creations: [], ledger: [], paymentsLive: false };

interface Store extends State {
  ready: boolean;
  update: (patch: Partial<Pick<State, "shopName" | "phone">>) => Promise<void>;
  /** Free credits while payments are in test mode. */
  testTopUp: (photos: number) => Promise<void>;
  /** Opens Cashfree checkout for a pack. The page leaves for Cashfree and comes back to /wallet?order=…. */
  buy: (photos: number) => Promise<void>;
  /** After Cashfree sends the jeweller back: confirms the order and refreshes the balance. */
  verifyPayment: (orderId: string) => Promise<"paid" | "pending" | "failed" | "unknown">;
  /** Shows a photo the server just made and recorded. */
  addCreation: (item: Creation) => void;
  /** Credits needed to download these photos: already-downloaded ones are free again. */
  costOf: (ids: string[]) => number;
  /** Has the server charge for the photos not downloaded before. Returns an error to show, or null. */
  chargeDownloads: (ids: string[]) => Promise<string | null>;
  flag: (id: string, note: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<Store | null>(null);

async function api(path: string, init?: RequestInit) {
  const res = await fetch(path, { ...init, headers: { "Content-Type": "application/json", ...init?.headers } });
  if (res.status === 401) {
    window.location.href = "/login";
    throw new Error("Signed out");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "Something went wrong. Try again.");
  return data;
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<State>(empty);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async () => {
    const data = await api("/api/account");
    setState({ ...empty, ...data });
    setReady(true);
  }, []);

  useEffect(() => {
    refresh().catch(() => {});
  }, [refresh]);

  const costOf = useCallback((ids: string[]) => state.creations.filter((c) => ids.includes(c.id) && !c.downloaded).length, [state.creations]);

  const store = useMemo<Store>(
    () => ({
      ...state,
      ready,
      update: async (patch) => {
        await api("/api/account", { method: "PATCH", body: JSON.stringify(patch) });
        setState((s) => ({ ...s, ...patch }));
      },
      testTopUp: async (photos) => {
        await api("/api/wallet/test-top-up", { method: "POST", body: JSON.stringify({ photos }) });
        await refresh();
      },
      buy: async (photos) => {
        const { paymentSessionId, mode } = await api("/api/payments/order", { method: "POST", body: JSON.stringify({ photos }) });
        const Cashfree = await loadCashfree();
        await Cashfree({ mode }).checkout({ paymentSessionId, redirectTarget: "_self" });
      },
      verifyPayment: async (orderId) => {
        const { state } = await api("/api/payments/verify", { method: "POST", body: JSON.stringify({ orderId }) });
        await refresh();
        return state;
      },
      addCreation: (item) => setState((s) => ({ ...s, creations: [item, ...s.creations.filter((c) => c.id !== item.id)] })),
      costOf,
      chargeDownloads: async (ids) => {
        try {
          await api("/api/downloads", { method: "POST", body: JSON.stringify({ ids }) });
          return null;
        } catch (err) {
          return (err as Error).message;
        } finally {
          await refresh().catch(() => {});
        }
      },
      flag: async (id, note) => {
        await api(`/api/creations/${id}/flag`, { method: "POST", body: JSON.stringify({ note }) });
        setState((s) => ({ ...s, creations: s.creations.map((c) => (c.id === id ? { ...c, flagged: true } : c)) }));
      },
      signOut: async () => {
        await authClient.signOut();
        window.location.href = "/login";
      },
    }),
    [state, ready, costOf, refresh],
  );

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

export function useStore() {
  const store = useContext(Ctx);
  if (!store) throw new Error("useStore must be used inside StoreProvider");
  return store;
}

type CashfreeFactory = (opts: { mode: "sandbox" | "production" }) => { checkout: (opts: { paymentSessionId: string; redirectTarget: "_self" }) => Promise<unknown> };

/** Cashfree's checkout script, loaded only when a jeweller pays. */
function loadCashfree(): Promise<CashfreeFactory> {
  const w = window as unknown as { Cashfree?: CashfreeFactory };
  if (w.Cashfree) return Promise.resolve(w.Cashfree);
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://sdk.cashfree.com/js/v3/cashfree.js";
    script.onload = () => (w.Cashfree ? resolve(w.Cashfree) : reject(new Error("Couldn't load the payment page. Try again.")));
    script.onerror = () => reject(new Error("Couldn't load the payment page. Check your internet and try again."));
    document.head.appendChild(script);
  });
}

/** Starts a browser download for each photo. Call after chargeDownloads succeeds. TODO: one zip from the server for big selections. */
export function downloadFiles(ids: string[]) {
  ids.forEach((id, i) =>
    setTimeout(() => {
      const a = document.createElement("a");
      a.href = `/api/renders/${id}?full=1`;
      a.click();
    }, i * 400),
  );
}
