import { and, count, eq, gte, sql } from "drizzle-orm";
import { db } from "./db";
import { usageEvents } from "./db/schema";

/**
 * Daily caps per account. Photo checks and previews cost us AI calls even when nothing is downloaded,
 * and brochure PDFs, zips and payment orders take server time or start work at Cashfree,
 * so these stop one account from running up a bill. Generous enough that a real jeweller never hits them.
 */
export const LIMITS = {
  /** Photos checked per day. */
  checksPerDay: Number(process.env.LIMIT_CHECKS_PER_DAY ?? 100),
  /** Previews made per day, across all pieces and looks. */
  previewsPerDay: Number(process.env.LIMIT_PREVIEWS_PER_DAY ?? 60),
  /** Tries of one look on one piece: the first preview plus free redos. */
  triesPerLook: Number(process.env.LIMIT_TRIES_PER_LOOK ?? 3),
  /** Brochure PDFs made per day. */
  pdfsPerDay: Number(process.env.LIMIT_PDFS_PER_DAY ?? 50),
  /** Zip downloads per day. */
  zipsPerDay: Number(process.env.LIMIT_ZIPS_PER_DAY ?? 50),
  /** Payment orders started per day. */
  ordersPerDay: Number(process.env.LIMIT_ORDERS_PER_DAY ?? 20),
};

export type UseKind = "check" | "preview" | "pdf" | "zip" | "order";

const daily: Record<UseKind, () => { max: number; message: string }> = {
  check: () => ({
    max: LIMITS.checksPerDay,
    message: `You've checked ${LIMITS.checksPerDay} photos in the last 24 hours, the daily limit. Try again tomorrow, or message us on WhatsApp for more.`,
  }),
  preview: () => ({
    max: LIMITS.previewsPerDay,
    message: `You've made ${LIMITS.previewsPerDay} previews in the last 24 hours, the daily limit. Download the ones you like, or try again tomorrow.`,
  }),
  pdf: () => ({
    max: LIMITS.pdfsPerDay,
    message: `You've made ${LIMITS.pdfsPerDay} brochure PDFs in the last 24 hours, the daily limit. Try again tomorrow, or message us on WhatsApp.`,
  }),
  zip: () => ({
    max: LIMITS.zipsPerDay,
    message: `You've downloaded ${LIMITS.zipsPerDay} zips in the last 24 hours, the daily limit. Your photos are safe; try again tomorrow.`,
  }),
  order: () => ({
    max: LIMITS.ordersPerDay,
    message: `You've started ${LIMITS.ordersPerDay} payments in the last 24 hours, the daily limit. Message us on WhatsApp and we'll help.`,
  }),
};

/**
 * Records one use if it is within the limits. Returns null when allowed, or a message for the jeweller.
 * A per-user lock makes two requests at once count correctly.
 */
export async function takeUse(userId: string, kind: UseKind, ref?: string): Promise<string | null> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${userId}))`);
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [today] = await tx
      .select({ n: count() })
      .from(usageEvents)
      .where(and(eq(usageEvents.userId, userId), eq(usageEvents.kind, kind), gte(usageEvents.at, since)));
    const { max, message } = daily[kind]();
    if (today.n >= max) return message;
    if (kind === "preview" && ref) {
      const [tries] = await tx.select({ n: count() }).from(usageEvents).where(and(eq(usageEvents.userId, userId), eq(usageEvents.ref, ref)));
      if (tries.n >= LIMITS.triesPerLook) return `This look has been tried ${LIMITS.triesPerLook} times on this piece. Try a different look, or retake the photo.`;
    }
    await tx.insert(usageEvents).values({ userId, kind, ref });
    return null;
  });
}
