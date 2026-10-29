import { NextResponse } from "next/server";
import { getBrochure, saveBrochure } from "@/lib/account";
import { currentUserId, unauthorized } from "@/lib/auth";
import { Brochure } from "@/lib/brochure";

export const runtime = "nodejs";

/** GET /api/brochures?collection=…  the saved brochure for that collection, or null. */
export async function GET(req: Request) {
  const userId = await currentUserId();
  if (!userId) return unauthorized();
  const collection = new URL(req.url).searchParams.get("collection");
  if (!collection) return NextResponse.json({ error: "Bad request" }, { status: 400 });
  return NextResponse.json({ brochure: await getBrochure(userId, collection) });
}

/** Saves a brochure. Refused until brochures unlock, and for photos that aren't downloaded or aren't in the collection. */
export async function PUT(req: Request) {
  const userId = await currentUserId();
  if (!userId) return unauthorized();
  const parsed = Brochure.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Bad request" }, { status: 400 });

  const result = await saveBrochure(userId, parsed.data);
  if (result.ok) return NextResponse.json(result);
  if (result.reason === "locked") return NextResponse.json({ error: "Brochures unlock after you download 15 photos." }, { status: 403 });
  return NextResponse.json({ error: "Only downloaded photos from this collection can go in the brochure." }, { status: 400 });
}
