import { NextResponse } from "next/server";
import { z } from "zod";
import { getAccount, updateProfile } from "@/lib/account";
import { currentUserId, unauthorized } from "@/lib/auth";
import { paymentsLive } from "@/lib/payments";

export const runtime = "nodejs";

/** Everything the app shows about the signed-in jeweller: profile, balance, photos and activity. */
export async function GET() {
  const userId = await currentUserId();
  if (!userId) return unauthorized();
  return NextResponse.json({ ...(await getAccount(userId)), paymentsLive: paymentsLive() });
}

const Patch = z.object({ shopName: z.string().trim().max(120).optional(), phone: z.string().trim().max(30).optional() });

export async function PATCH(req: Request) {
  const userId = await currentUserId();
  if (!userId) return unauthorized();
  const parsed = Patch.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Bad request" }, { status: 400 });
  await updateProfile(userId, parsed.data);
  return NextResponse.json({ ok: true });
}
