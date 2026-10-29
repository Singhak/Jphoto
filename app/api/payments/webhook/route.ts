import { NextResponse } from "next/server";
import { settleOrder, verifyWebhook } from "@/lib/payments";
import { reportError } from "@/lib/report";

export const runtime = "nodejs";

/**
 * Cashfree's payment webhook. The signature proves it came from Cashfree; settleOrder then
 * asks Cashfree for the order itself, so only a real, fully paid order adds credits.
 */
export async function POST(req: Request) {
  const raw = await req.text();
  if (!verifyWebhook(raw, req.headers.get("x-webhook-timestamp"), req.headers.get("x-webhook-signature"))) {
    return NextResponse.json({ error: "Bad signature" }, { status: 401 });
  }
  const orderId: unknown = JSON.parse(raw)?.data?.order?.order_id;
  if (typeof orderId !== "string") return NextResponse.json({ ok: true });
  try {
    await settleOrder(orderId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    // A 5xx makes Cashfree retry later.
    reportError("payment webhook", err, { orderId });
    return NextResponse.json({ error: "Try again" }, { status: 500 });
  }
}
