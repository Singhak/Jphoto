import { and, desc, eq, gte, inArray, isNull, sql } from "drizzle-orm";
import { BROCHURE_UNLOCK, type Brochure, type PieceDetails } from "./brochure";
import { WELCOME_CREDITS } from "./catalog";
import { db } from "./db";
import { brochures, creations, creditLedger, profiles, user } from "./db/schema";
import type { PieceType } from "./pipeline/presets";

/** Server-side account logic. Credits only ever change here, inside a transaction. */

/** Shapes sent to the browser (lib/store.tsx). */
export interface Creation {
  id: string;
  piece: PieceType;
  styleId: string;
  collection: string;
  createdAt: number;
  downloaded: boolean;
  flagged?: boolean;
  details: PieceDetails;
}
export type LedgerKind = (typeof creditLedger.kind.enumValues)[number];
export interface LedgerEntry {
  at: number;
  kind: LedgerKind;
  credits: number;
  note: string;
}

const toCreation = (c: typeof creations.$inferSelect): Creation => ({
  id: c.id,
  piece: c.piece as PieceType,
  styleId: c.styleId,
  collection: c.collection,
  createdAt: c.createdAt.getTime(),
  downloaded: c.downloadedAt !== null,
  flagged: c.flaggedAt !== null,
  details: detailsOf(c),
});

function detailsOf(c: typeof creations.$inferSelect): PieceDetails {
  return { name: c.designName, code: c.designCode, purity: c.purity as PieceDetails["purity"], weight: c.weight };
}

/** Makes the profile with the welcome credits on first visit. Safe to call on every request. */
export async function ensureProfile(userId: string) {
  await db.transaction(async (tx) => {
    const made = await tx.insert(profiles).values({ userId, credits: WELCOME_CREDITS }).onConflictDoNothing().returning({ userId: profiles.userId });
    if (made.length) await tx.insert(creditLedger).values({ userId, kind: "welcome", credits: WELCOME_CREDITS, note: "Welcome photos" });
  });
}

export async function getAccount(userId: string) {
  await ensureProfile(userId);
  const [[me], [profile], items, ledger] = await Promise.all([
    db.select({ name: user.name, email: user.email, image: user.image }).from(user).where(eq(user.id, userId)),
    db.select().from(profiles).where(eq(profiles.userId, userId)),
    db.select().from(creations).where(eq(creations.userId, userId)).orderBy(desc(creations.createdAt)),
    db.select().from(creditLedger).where(eq(creditLedger.userId, userId)).orderBy(desc(creditLedger.at), desc(creditLedger.id)).limit(200),
  ]);
  return {
    ...me,
    shopName: profile.shopName,
    phone: profile.phone,
    address: profile.address,
    city: profile.city,
    gstin: profile.gstin,
    hours: profile.hours,
    logoTone: profile.logoTone,
    logoVersion: profile.logoVersion,
    credits: profile.credits,
    creations: items.map(toCreation),
    ledger: ledger.map((e): LedgerEntry => ({ at: e.at.getTime(), kind: e.kind, credits: e.credits, note: e.note })),
  };
}

export type ProfilePatch = Partial<Pick<typeof profiles.$inferSelect, "shopName" | "phone" | "address" | "city" | "gstin" | "hours">>;

export async function updateProfile(userId: string, patch: ProfilePatch) {
  await ensureProfile(userId);
  await db.update(profiles).set(patch).where(eq(profiles.userId, userId));
}

export async function addCreation(userId: string, item: { id: string; piece: string; styleId: string; collection: string }): Promise<Creation> {
  const [row] = await db.insert(creations).values({ ...item, userId }).returning();
  return toCreation(row);
}

export type ChargeResult = { ok: true; charged: number } | { ok: false; reason: "not-found" | "short" };

/**
 * Charges one credit for each photo not downloaded before; photos already paid for are free again.
 * Row locks make two downloads at once (two tabs, a double tap) charge only once.
 */
export async function chargeDownloads(userId: string, ids: string[]): Promise<ChargeResult> {
  return db.transaction(async (tx) => {
    const rows = await tx
      .select({ id: creations.id, downloadedAt: creations.downloadedAt })
      .from(creations)
      .where(and(eq(creations.userId, userId), inArray(creations.id, ids)))
      .for("update");
    if (rows.length !== new Set(ids).size) return { ok: false, reason: "not-found" };

    const fresh = rows.filter((r) => r.downloadedAt === null).map((r) => r.id);
    if (fresh.length === 0) return { ok: true, charged: 0 };

    const paid = await tx
      .update(profiles)
      .set({ credits: sql`${profiles.credits} - ${fresh.length}` })
      .where(and(eq(profiles.userId, userId), gte(profiles.credits, fresh.length)))
      .returning({ credits: profiles.credits });
    if (paid.length === 0) return { ok: false, reason: "short" };

    await tx.update(creations).set({ downloadedAt: new Date() }).where(inArray(creations.id, fresh));
    const n = fresh.length;
    await tx.insert(creditLedger).values({ userId, kind: "download", credits: -n, note: `${n} photo${n > 1 ? "s" : ""} downloaded` });
    return { ok: true, charged: n };
  });
}

/** True if this user has paid for this photo, so the full-size file may be sent. */
export async function canDownload(userId: string, id: string) {
  const [row] = await db
    .select({ id: creations.id })
    .from(creations)
    .where(and(eq(creations.id, id), eq(creations.userId, userId), sql`${creations.downloadedAt} is not null`));
  return Boolean(row);
}

/** The photos among these ids that this account has paid for, with what's needed to name their files. */
export function paidCreations(userId: string, ids: string[]) {
  return db
    .select({ id: creations.id, piece: creations.piece, styleId: creations.styleId, collection: creations.collection, designName: creations.designName, designCode: creations.designCode })
    .from(creations)
    .where(and(inArray(creations.id, ids), eq(creations.userId, userId), sql`${creations.downloadedAt} is not null`))
    .orderBy(creations.collection, creations.createdAt);
}

/** Puts a downloaded photo in the review queue. Only photos already paid for can be flagged, once. */
export async function flagCreation(userId: string, id: string, note: string) {
  const flagged = await db
    .update(creations)
    .set({ flaggedAt: new Date(), flagNote: note })
    .where(and(eq(creations.id, id), eq(creations.userId, userId), isNull(creations.flaggedAt), sql`${creations.downloadedAt} is not null`))
    .returning({ id: creations.id });
  return flagged.length > 0;
}

/** Adds credits without a payment. Only for testing until Cashfree is wired up; the route refuses it in production. */
export async function testTopUp(userId: string, photos: number) {
  await ensureProfile(userId);
  await db.transaction(async (tx) => {
    await tx.update(profiles).set({ credits: sql`${profiles.credits} + ${photos}` }).where(eq(profiles.userId, userId));
    await tx.insert(creditLedger).values({ userId, kind: "top-up", credits: photos, note: `Top-up of ${photos} photos (test mode)` });
  });
}

async function downloadedCount(userId: string) {
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(creations)
    .where(and(eq(creations.userId, userId), sql`${creations.downloadedAt} is not null`));
  return row.n;
}

export const brochuresUnlocked = async (userId: string) => (await downloadedCount(userId)) >= BROCHURE_UNLOCK;

/** The saved brochure for a collection, with each photo's details, or null if the jeweller hasn't made one yet. */
export async function getBrochure(userId: string, collection: string): Promise<Brochure | null> {
  const [row] = await db.select().from(brochures).where(and(eq(brochures.userId, userId), eq(brochures.collection, collection)));
  if (!row) return null;
  const ids = row.items.map((i) => i.creationId);
  const photos = ids.length
    ? await db.select().from(creations).where(and(eq(creations.userId, userId), inArray(creations.id, ids), sql`${creations.downloadedAt} is not null`))
    : [];
  const byId = new Map(photos.map((c) => [c.id, c]));
  const items = row.items.flatMap(({ creationId, featured, note }) => {
    const c = byId.get(creationId);
    return c ? [{ creationId, featured, note, ...detailsOf(c) }] : [];
  });
  return { collection: row.collection, template: row.template as Brochure["template"], title: row.title, subtitle: row.subtitle, items };
}

export type SaveBrochureResult = { ok: true } | { ok: false; reason: "locked" | "bad-photos" };

/**
 * Only photos this jeweller has paid for, from this collection, can go in: the brochure shows them full size.
 * Each photo's name, code, purity and weight are saved on the photo itself, so they are there next time.
 */
export async function saveBrochure(userId: string, b: Brochure): Promise<SaveBrochureResult> {
  if (!(await brochuresUnlocked(userId))) return { ok: false, reason: "locked" };
  const ids = b.items.map((i) => i.creationId);
  if (new Set(ids).size !== ids.length) return { ok: false, reason: "bad-photos" };
  if (ids.length) {
    const rows = await db
      .select({ id: creations.id })
      .from(creations)
      .where(and(eq(creations.userId, userId), eq(creations.collection, b.collection), inArray(creations.id, ids), sql`${creations.downloadedAt} is not null`));
    if (rows.length !== ids.length) return { ok: false, reason: "bad-photos" };
  }
  const layout = b.items.map(({ creationId, featured, note }) => ({ creationId, featured, note }));
  const values = { template: b.template, title: b.title, subtitle: b.subtitle, items: layout, updatedAt: new Date() };
  await db.transaction(async (tx) => {
    for (const i of b.items) {
      await tx
        .update(creations)
        .set({ designName: i.name, designCode: i.code, purity: i.purity, weight: i.weight })
        .where(and(eq(creations.id, i.creationId), eq(creations.userId, userId)));
    }
    await tx
      .insert(brochures)
      .values({ userId, collection: b.collection, ...values })
      .onConflictDoUpdate({ target: [brochures.userId, brochures.collection], set: values });
  });
  return { ok: true };
}

/** The shop details printed on brochures. */
export async function getShop(userId: string) {
  await ensureProfile(userId);
  const [p] = await db
    .select({
      shopName: profiles.shopName,
      phone: profiles.phone,
      address: profiles.address,
      city: profiles.city,
      gstin: profiles.gstin,
      hours: profiles.hours,
      logoTone: profiles.logoTone,
      logoVersion: profiles.logoVersion,
    })
    .from(profiles)
    .where(eq(profiles.userId, userId));
  return p;
}

/** Records a new logo (already stored by lib/logo.ts), or removes it with tone "". */
export async function setLogo(userId: string, tone: (typeof profiles.logoTone.enumValues)[number]) {
  await ensureProfile(userId);
  const [row] = await db
    .update(profiles)
    .set({ logoTone: tone, logoVersion: sql`${profiles.logoVersion} + 1` })
    .where(eq(profiles.userId, userId))
    .returning({ logoVersion: profiles.logoVersion });
  return row.logoVersion;
}
