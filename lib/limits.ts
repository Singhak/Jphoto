import { and, count, eq, gte, sql } from "drizzle-orm";
import { db } from "./db";
import { usageEvents } from "./db/schema";

/**
 * Caps on free work. Photo checks and previews cost us AI calls even when nothing is downloaded,
 * so these stop one account from running up a bill. Generous enough that a real jeweller never hits them.
 */
export const LIMITS = {
  /** Photos checked per day. */
  checksPerDay: Number(process.env.LIMIT_CHECKS_PER_DAY ?? 100),
  /** Previews made per day, across all pieces and looks. */
  previewsPerDay: Number(process.env.LIMIT_PREVIEWS_PER_DAY ?? 60),
  /** Tries of one look on one piece: the first preview plus free redos. */
  triesPerLook: Number(process.env.LIMIT_TRIES_PER_LOOK ?? 3),
};

/**
 * Records one free use if it is within the limits. Returns null when allowed, or a message for the jeweller.
 * A per-user lock makes two requests at once count correctly.
 */
export async function takeFree(userId: string, kind: "check" | "preview", ref?: string): Promise<string | null> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${userId}))`);
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [today] = await tx
      .select({ n: count() })
      .from(usageEvents)
      .where(and(eq(usageEvents.userId, userId), eq(usageEvents.kind, kind), gte(usageEvents.at, since)));
    if (kind === "check" && today.n >= LIMITS.checksPerDay) {
      return `You've checked ${LIMITS.checksPerDay} photos in the last 24 hours, the daily limit. Try again tomorrow, or message us on WhatsApp for more.`;
    }
    if (kind === "preview" && today.n >= LIMITS.previewsPerDay) {
      return `You've made ${LIMITS.previewsPerDay} previews in the last 24 hours, the daily limit. Download the ones you like, or try again tomorrow.`;
    }
    if (kind === "preview" && ref) {
      const [tries] = await tx.select({ n: count() }).from(usageEvents).where(and(eq(usageEvents.userId, userId), eq(usageEvents.ref, ref)));
      if (tries.n >= LIMITS.triesPerLook) return `This look has been tried ${LIMITS.triesPerLook} times on this piece. Try a different look, or retake the photo.`;
    }
    await tx.insert(usageEvents).values({ userId, kind, ref });
    return null;
  });
}
