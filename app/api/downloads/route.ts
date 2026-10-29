import { NextResponse } from "next/server";
import { z } from "zod";
import { chargeDownloads } from "@/lib/account";
import { currentUserId, unauthorized } from "@/lib/auth";
import { isId } from "@/lib/renders";

export const runtime = "nodejs";

const Body = z.object({ ids: z.array(z.string().refine(isId)).min(1).max(500) });

/** Spends the credits for these photos. After this, GET /api/renders/{id}?full=1 sends the full-size files. */
export async function POST(req: Request) {
  const userId = await currentUserId();
  if (!userId) return unauthorized();
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Bad request" }, { status: 400 });

  const result = await chargeDownloads(userId, parsed.data.ids);
  if (result.ok) return NextResponse.json(result);
  if (result.reason === "short") return NextResponse.json({ error: "Not enough photos left. Top up to download these." }, { status: 402 });
  return NextResponse.json({ error: "Some of these photos were not found." }, { status: 404 });
}
