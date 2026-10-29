"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { WELCOME_CREDITS } from "./catalog";
import type { PieceType } from "./pipeline/presets";

/**
 * Account state kept in the browser until Supabase is wired up.
 * Credits here are NOT secure: the download route must check and charge credits on the server before launch.
 */

export interface Creation {
  /** Render id; the preview and full image are served from /api/renders/{id}. */
  id: string;
  piece: PieceType;
  styleId: string;
  collection: string;
  createdAt: number;
  downloaded: boolean;
  flagged?: boolean;
}

export type LedgerKind = "welcome" | "top-up" | "download" | "refund";
export interface LedgerEntry {
  at: number;
  kind: LedgerKind;
  credits: number;
  note: string;
}

interface State {
  shopName: string;
  phone: string;
  credits: number;
  creations: Creation[];
  ledger: LedgerEntry[];
}

const fresh = (): State => ({
  shopName: "",
  phone: "",
  credits: WELCOME_CREDITS,
  creations: [],
  ledger: [{ at: Date.now(), kind: "welcome", credits: WELCOME_CREDITS, note: "Welcome photos" }],
});
const KEY = "jphoto-account-v2";

interface Store extends State {
  ready: boolean;
  update: (patch: Partial<Pick<State, "shopName" | "phone">>) => void;
  addCredits: (credits: number, kind: LedgerKind, note: string) => void;
  addCreation: (item: Creation) => void;
  /** Credits needed to download these photos: already-downloaded ones are free again. */
  costOf: (ids: string[]) => number;
  /** Charges for the photos not downloaded before. Returns false (and charges nothing) if credits are short. */
  chargeDownloads: (ids: string[]) => boolean;
  flag: (id: string) => void;
  reset: () => void;
}

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<State>(fresh);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(KEY);
      if (saved) setState({ ...fresh(), ...JSON.parse(saved) });
    } catch {}
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {}
  }, [state, ready]);

  const costOf = useCallback((ids: string[]) => state.creations.filter((c) => ids.includes(c.id) && !c.downloaded).length, [state.creations]);

  const chargeDownloads = useCallback(
    (ids: string[]) => {
      const cost = costOf(ids);
      if (cost > state.credits) return false;
      if (cost === 0) return true;
      setState((s) => ({
        ...s,
        credits: s.credits - cost,
        creations: s.creations.map((c) => (ids.includes(c.id) ? { ...c, downloaded: true } : c)),
        ledger: [{ at: Date.now(), kind: "download", credits: -cost, note: `${cost} photo${cost > 1 ? "s" : ""} downloaded` }, ...s.ledger],
      }));
      return true;
    },
    [costOf, state.credits],
  );

  const store = useMemo<Store>(
    () => ({
      ...state,
      ready,
      update: (patch) => setState((s) => ({ ...s, ...patch })),
      addCredits: (credits, kind, note) =>
        setState((s) => ({ ...s, credits: s.credits + credits, ledger: [{ at: Date.now(), kind, credits, note }, ...s.ledger] })),
      addCreation: (item) => setState((s) => ({ ...s, creations: [item, ...s.creations] })),
      costOf,
      chargeDownloads,
      flag: (id) => setState((s) => ({ ...s, creations: s.creations.map((c) => (c.id === id ? { ...c, flagged: true } : c)) })),
      reset: () => setState(fresh()),
    }),
    [state, ready, costOf, chargeDownloads],
  );

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

export function useStore() {
  const store = useContext(Ctx);
  if (!store) throw new Error("useStore must be used inside StoreProvider");
  return store;
}

/** Starts a browser download for each photo. TODO: one zip from the server for big selections. */
export function downloadFiles(ids: string[]) {
  ids.forEach((id, i) =>
    setTimeout(() => {
      const a = document.createElement("a");
      a.href = `/api/renders/${id}?full=1`;
      a.click();
    }, i * 400),
  );
}
