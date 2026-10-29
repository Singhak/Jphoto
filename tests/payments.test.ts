import { createHmac } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";
import { creditLedger, payments } from "@/lib/db/schema";
import { settleOrder, verifyWebhook } from "@/lib/payments";
import { creditsOf, makeJeweller } from "./helpers";

/** Stands in for Cashfree's "get order" call. */
function cashfreeSays(order: { order_status: string; order_amount: number }) {
  const fetch = vi.fn(async () => Response.json(order));
  vi.stubGlobal("fetch", fetch);
  return fetch;
}

async function makeOrder(userId: string, photos: number, amount: number) {
  const orderId = `jp_test_${Math.random().toString(36).slice(2)}`;
  await db.insert(payments).values({ orderId, userId, photos, amount });
  return orderId;
}

afterEach(() => vi.unstubAllGlobals());

describe("settleOrder", () => {
  it("adds credits once when the webhook and the return URL arrive together", async () => {
    const userId = await makeJeweller(0);
    const orderId = await makeOrder(userId, 25, 875);
    cashfreeSays({ order_status: "PAID", order_amount: 875 });

    const results = await Promise.all(Array.from({ length: 5 }, () => settleOrder(orderId)));

    expect(results).toEqual(Array(5).fill("paid"));
    expect(await creditsOf(userId)).toBe(25);
    const ledger = await db.select().from(creditLedger).where(eq(creditLedger.userId, userId));
    expect(ledger.filter((e) => e.kind === "top-up")).toHaveLength(1);
  });

  it("adds nothing more when a paid order is settled again", async () => {
    const userId = await makeJeweller(0);
    const orderId = await makeOrder(userId, 10, 400);
    const fetch = cashfreeSays({ order_status: "PAID", order_amount: 400 });
    await settleOrder(orderId);
    await settleOrder(orderId);

    expect(await creditsOf(userId)).toBe(10);
    // The second call sees the paid row and doesn't ask Cashfree again.
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("adds nothing when Cashfree's amount differs from ours", async () => {
    const userId = await makeJeweller(0);
    const orderId = await makeOrder(userId, 25, 875);
    cashfreeSays({ order_status: "PAID", order_amount: 1 });

    expect(await settleOrder(orderId)).toBe("pending");
    expect(await creditsOf(userId)).toBe(0);
  });

  it("adds nothing for an unpaid order, and marks an expired one failed", async () => {
    const userId = await makeJeweller(0);
    const orderId = await makeOrder(userId, 10, 400);
    cashfreeSays({ order_status: "ACTIVE", order_amount: 400 });
    expect(await settleOrder(orderId)).toBe("pending");

    cashfreeSays({ order_status: "EXPIRED", order_amount: 400 });
    expect(await settleOrder(orderId)).toBe("failed");
    expect(await creditsOf(userId)).toBe(0);
  });

  it("knows nothing of an order that isn't ours", async () => {
    const fetch = cashfreeSays({ order_status: "PAID", order_amount: 400 });
    expect(await settleOrder("jp_not_a_real_order")).toBe("unknown");
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe("verifyWebhook", () => {
  const body = JSON.stringify({ data: { order: { order_id: "jp_x" } } });
  const timestamp = "1761700000";
  const signed = createHmac("sha256", "test-secret").update(timestamp + body).digest("base64");

  it("accepts Cashfree's signature", () => {
    expect(verifyWebhook(body, timestamp, signed)).toBe(true);
  });

  it("rejects a changed body, a wrong signature or a missing header", () => {
    expect(verifyWebhook(body.replace("jp_x", "jp_y"), timestamp, signed)).toBe(false);
    expect(verifyWebhook(body, timestamp, "bm90IGEgc2lnbmF0dXJl")).toBe(false);
    expect(verifyWebhook(body, null, signed)).toBe(false);
    expect(verifyWebhook(body, timestamp, null)).toBe(false);
  });
});
