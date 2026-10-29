import { NextResponse } from "next/server";
import { z } from "zod";
import { flagCreation } from "@/lib/account";
import { currentUserId, unauthorized } from "@/lib/auth";
import { isId } from "@/lib/renders";

export const runtime = "nodejs";

const Body = z.object({ note: z.string().trim().min(5).max(2000) });

/** Sends a downloaded photo for review with the jeweller's note on what looks wrong. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await currentUserId();
  if (!userId) return unauthorized();
  const { id } = await params;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!isId(id) || !parsed.success) return NextResponse.json({ error: "Bad request" }, { status: 400 });
  if (!(await flagCreation(userId, id, parsed.data.note))) return NextResponse.json({ error: "This photo can't be flagged." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
