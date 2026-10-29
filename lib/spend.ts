import { db } from "./db";
import { aiSpend } from "./db/schema";
import { withSpend } from "./pipeline";
import { reportError } from "./report";

/**
 * Runs one photo check or preview and saves the paid AI calls it made, even when it fails.
 * Saving happens in the background: a lost row only makes the spend report slightly low, so it never holds up the jeweller.
 */
export function trackSpend<T>(userId: string, kind: "check" | "preview", ref: string | undefined, fn: () => Promise<T>): Promise<T> {
  return withSpend(fn, (spend) => {
    db.insert(aiSpend)
      .values({ userId, kind, ref, calls: spend.calls, falFillUsd: spend.falFillUsd })
      .catch((err) => reportError("ai spend", err, { kind }));
  });
}
