import { NextResponse } from "next/server";
import { z } from "zod";
import { testTopUp } from "@/lib/account";
import { currentUserId, unauthorized } from "@/lib/auth";
import { TOP_UPS } from "@/lib/catalog";

export const runtime = "nodejs";

/** Free credits for testing, until Cashfree checkout and its payment webhook replace this route. */
const testTopUpsAllowed = () => process.env.NODE_ENV !== "production" || process.env.ALLOW_TEST_TOPUP === "1";

const Body = z.object({ photos: z.number().refine((n) => TOP_UPS.some((t) => t.photos === n)) });

export async function POST(req: Request) {
  if (!testTopUpsAllowed()) return NextResponse.json({ error: "Payments are not set up yet." }, { status: 503 });
  const userId = await currentUserId();
  if (!userId) return unauthorized();
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Bad request" }, { status: 400 });
  await testTopUp(userId, parsed.data.photos);
  return NextResponse.json({ ok: true });
}
