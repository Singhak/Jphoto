import { AsyncLocalStorage } from "node:async_hooks";

/** Counts paid API calls so every run can show what it spent. */
export type PaidCall = "fal-fill" | "fal-cutout" | "gemini-image" | "gemini-check";

/** fal FLUX Fill: $0.05 per megapixel, rounded up (fal.ai model page, Oct 2026). */
export const FAL_FILL_USD_PER_MP = 0.05;

export interface Spend {
  calls: Record<PaidCall, number>;
  falFillUsd: number;
}

const empty = (): Spend => ({ calls: { "fal-fill": 0, "fal-cutout": 0, "gemini-image": 0, "gemini-check": 0 }, falFillUsd: 0 });

/** Everything this process has spent (scripts print it at the end). */
const total = empty();
/** What the current request has spent, when it runs inside withSpend. */
const current = new AsyncLocalStorage<Spend>();

export function recordCall(kind: PaidCall, megapixels?: number) {
  for (const spend of [total, current.getStore()]) {
    if (!spend) continue;
    spend.calls[kind]++;
    if (kind === "fal-fill" && megapixels) spend.falFillUsd += Math.ceil(megapixels) * FAL_FILL_USD_PER_MP;
  }
}

export function usageSummary() {
  return { ...total.calls, falFillUsd: total.falFillUsd };
}

/** Runs fn and hands what it spent to done, even if fn throws: failed work still costs money. */
export async function withSpend<T>(fn: () => Promise<T>, done: (spend: Spend) => void): Promise<T> {
  const spend = empty();
  try {
    return await current.run(spend, fn);
  } finally {
    done(spend);
  }
}
