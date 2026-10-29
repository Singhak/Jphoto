import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { and, eq, ne, sql } from "drizzle-orm";
import { ensureProfile } from "./account";
import { mobileDigits, topUpPrice } from "./catalog";
import { db } from "./db";
import { creditLedger, payments, profiles, user } from "./db/schema";

/**
 * Cashfree Payment Gateway (UPI, cards, netbanking). The flow:
 *   1. createOrder: a row in `payments`, then a Cashfree order; the browser opens Cashfree checkout.
 *   2. Cashfree calls our webhook and sends the jeweller back to /wallet?order=…; both call settleOrder.
 *   3. settleOrder asks Cashfree for the order and adds the credits once, only if it is paid in full.
 * Asking Cashfree directly, instead of trusting the webhook body or the return URL, means a forged
 * request can never add credits.
 */

const API_VERSION = "2023-08-01";

const config = () => {
  const appId = process.env.CASHFREE_APP_ID;
  const secret = process.env.CASHFREE_SECRET_KEY;
  const mode = process.env.CASHFREE_ENV === "production" ? "production" : "sandbox";
  return appId && secret ? { appId, secret, mode, base: mode === "production" ? "https://api.cashfree.com/pg" : "https://sandbox.cashfree.com/pg" } : null;
};

export const paymentsLive = () => config() !== null;

async function cashfree(path: string, init?: RequestInit) {
  const c = config();
  if (!c) throw new Error("Cashfree is not configured");
  const res = await fetch(`${c.base}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", "x-client-id": c.appId, "x-client-secret": c.secret, "x-api-version": API_VERSION },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Cashfree ${path} failed (${res.status}): ${data.message ?? "no message"}`);
  return data;
}

export type CreateOrderResult = { ok: true; paymentSessionId: string; mode: "sandbox" | "production" } | { ok: false; error: string };

export async function createOrder(userId: string, photos: number, siteUrl: string): Promise<CreateOrderResult> {
  const c = config();
  const amount = topUpPrice(photos);
  if (!c || amount === null) return { ok: false, error: "Payments are not set up yet." };
  await ensureProfile(userId);
  const [me] = await db
    .select({ name: user.name, email: user.email, phone: profiles.phone })
    .from(user)
    .innerJoin(profiles, eq(profiles.userId, user.id))
    .where(eq(user.id, userId));
  const phone = mobileDigits(me.phone);
  if (!phone) return { ok: false, error: "Add your 10-digit mobile number first. Cashfree needs it for the receipt." };

  const orderId = `jp_${randomUUID().replaceAll("-", "")}`;
  await db.insert(payments).values({ orderId, userId, photos, amount });
  // Cashfree only calls https webhooks, so local development relies on the return URL alone.
  const notify = siteUrl.startsWith("https://") ? { notify_url: `${siteUrl}/api/payments/webhook` } : {};
  const order = await cashfree("/orders", {
    method: "POST",
    body: JSON.stringify({
      order_id: orderId,
      order_amount: amount,
      order_currency: "INR",
      order_note: `${photos} photos`,
      customer_details: { customer_id: userId.replace(/[^A-Za-z0-9_-]/g, "").slice(0, 50), customer_name: me.name, customer_email: me.email, customer_phone: phone },
      order_meta: { return_url: `${siteUrl}/wallet?order={order_id}`, ...notify },
    }),
  });
  return { ok: true, paymentSessionId: order.payment_session_id, mode: c.mode as "sandbox" | "production" };
}

export type OrderState = "paid" | "pending" | "failed" | "unknown";

/** Checks the order with Cashfree and adds the credits if it is paid. Safe to call any number of times. */
export async function settleOrder(orderId: string): Promise<OrderState> {
  const [row] = await db.select().from(payments).where(eq(payments.orderId, orderId));
  if (!row) return "unknown";
  if (row.status === "paid") return "paid";

  const order = await cashfree(`/orders/${encodeURIComponent(orderId)}`);
  if (order.order_status === "PAID" && Number(order.order_amount) === row.amount) {
    await db.transaction(async (tx) => {
      // Only the first caller to flip the status adds credits; the webhook and the return URL often race.
      const won = await tx
        .update(payments)
        .set({ status: "paid", paidAt: new Date() })
        .where(and(eq(payments.orderId, orderId), ne(payments.status, "paid")))
        .returning({ orderId: payments.orderId });
      if (!won.length) return;
      await tx.update(profiles).set({ credits: sql`${profiles.credits} + ${row.photos}` }).where(eq(profiles.userId, row.userId));
      await tx.insert(creditLedger).values({ userId: row.userId, kind: "top-up", credits: row.photos, note: `Bought ${row.photos} photos (₹${row.amount.toLocaleString("en-IN")})` });
    });
    return "paid";
  }
  if (order.order_status === "EXPIRED" || order.order_status === "TERMINATED") {
    await db.update(payments).set({ status: "failed" }).where(and(eq(payments.orderId, orderId), eq(payments.status, "created")));
    return "failed";
  }
  return "pending";
}

/** The order, if it belongs to this user. Stops one jeweller checking another's orders. */
export async function ownsOrder(userId: string, orderId: string) {
  const [row] = await db.select({ orderId: payments.orderId }).from(payments).where(and(eq(payments.orderId, orderId), eq(payments.userId, userId)));
  return Boolean(row);
}

/** Cashfree signs webhooks as base64(HMAC-SHA256(timestamp + raw body, secret key)). */
export function verifyWebhook(rawBody: string, timestamp: string | null, signature: string | null) {
  const c = config();
  if (!c || !timestamp || !signature) return false;
  const expected = createHmac("sha256", c.secret).update(timestamp + rawBody).digest("base64");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && timingSafeEqual(a, b);
}
