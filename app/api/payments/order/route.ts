import { NextResponse } from "next/server";
import { z } from "zod";
import { currentUserId, unauthorized } from "@/lib/auth";
import { createOrder } from "@/lib/payments";

export const runtime = "nodejs";

const Body = z.object({ photos: z.number().int().positive() });

/** Starts a Cashfree order for a top-up pack. The browser then opens Cashfree checkout with the session id. */
export async function POST(req: Request) {
  const userId = await currentUserId();
  if (!userId) return unauthorized();
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Bad request" }, { status: 400 });

  try {
    const site = process.env.BETTER_AUTH_URL ?? new URL(req.url).origin;
    const result = await createOrder(userId, parsed.data.photos, site.replace(/\/$/, ""));
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json(result);
  } catch (err) {
    console.error("payment order failed", err);
    return NextResponse.json({ error: "Couldn't start the payment. No money was taken. Try again in a minute." }, { status: 502 });
  }
}
