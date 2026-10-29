import { NextResponse } from "next/server";
import { z } from "zod";
import { currentUserId, unauthorized } from "@/lib/auth";
import { ownsOrder, settleOrder } from "@/lib/payments";

export const runtime = "nodejs";

const Body = z.object({ orderId: z.string().min(3).max(64) });

/** Called when Cashfree sends the jeweller back to /wallet. Adds the credits if the webhook hasn't already. */
export async function POST(req: Request) {
  const userId = await currentUserId();
  if (!userId) return unauthorized();
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success || !(await ownsOrder(userId, parsed.data.orderId))) return NextResponse.json({ error: "Order not found." }, { status: 404 });

  try {
    return NextResponse.json({ state: await settleOrder(parsed.data.orderId) });
  } catch (err) {
    console.error("payment verify failed", err);
    return NextResponse.json({ state: "pending" });
  }
}
