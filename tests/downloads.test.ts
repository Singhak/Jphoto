import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { canDownload, chargeDownloads } from "@/lib/account";
import { db } from "@/lib/db";
import { creditLedger } from "@/lib/db/schema";
import { creditsOf, makeCreation, makeJeweller } from "./helpers";

describe("chargeDownloads", () => {
  it("charges one credit per new photo and nothing to download it again", async () => {
    const userId = await makeJeweller(5);
    const a = await makeCreation(userId);
    const b = await makeCreation(userId);

    expect(await chargeDownloads(userId, [a, b])).toEqual({ ok: true, charged: 2 });
    expect(await chargeDownloads(userId, [a, b])).toEqual({ ok: true, charged: 0 });
    expect(await creditsOf(userId)).toBe(3);
    expect(await canDownload(userId, a)).toBe(true);
  });

  it("charges once when the same photo is downloaded from two tabs at once", async () => {
    const userId = await makeJeweller(5);
    const a = await makeCreation(userId);

    const results = await Promise.all(Array.from({ length: 5 }, () => chargeDownloads(userId, [a])));

    expect(results.filter((r) => r.ok && r.charged === 1)).toHaveLength(1);
    expect(await creditsOf(userId)).toBe(4);
    const ledger = await db.select().from(creditLedger).where(eq(creditLedger.userId, userId));
    expect(ledger).toHaveLength(1);
  });

  it("never lets parallel downloads take the balance below zero", async () => {
    const userId = await makeJeweller(2);
    const ids = await Promise.all(Array.from({ length: 5 }, () => makeCreation(userId)));

    const results = await Promise.all(ids.map((id) => chargeDownloads(userId, [id])));

    expect(results.filter((r) => r.ok)).toHaveLength(2);
    expect(results.filter((r) => !r.ok && r.reason === "short")).toHaveLength(3);
    expect(await creditsOf(userId)).toBe(0);
  });

  it("charges nothing when there aren't enough credits for all the photos", async () => {
    const userId = await makeJeweller(1);
    const ids = [await makeCreation(userId), await makeCreation(userId)];

    expect(await chargeDownloads(userId, ids)).toEqual({ ok: false, reason: "short" });
    expect(await creditsOf(userId)).toBe(1);
    expect(await canDownload(userId, ids[0])).toBe(false);
  });

  it("refuses another jeweller's photo", async () => {
    const owner = await makeJeweller(5);
    const other = await makeJeweller(5);
    const photo = await makeCreation(owner);

    expect(await chargeDownloads(other, [photo])).toEqual({ ok: false, reason: "not-found" });
    expect(await creditsOf(other)).toBe(5);
    expect(await canDownload(other, photo)).toBe(false);
  });
});
