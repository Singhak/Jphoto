import { NextResponse } from "next/server";
import { z } from "zod";
import { brochuresUnlocked, getBrochure, getShop } from "@/lib/account";
import { currentUserId, unauthorized } from "@/lib/auth";
import { brochurePdf } from "@/lib/brochure-pdf";
import { takeUse } from "@/lib/limits";
import { reportError } from "@/lib/report";

export const runtime = "nodejs";

const Body = z.object({ collection: z.string().min(1).max(120) });

/** The saved brochure for a collection as a PDF. The browser saves the brochure first, so this is what it shows. */
export async function POST(req: Request) {
  const userId = await currentUserId();
  if (!userId) return unauthorized();
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Bad request" }, { status: 400 });

  if (!(await brochuresUnlocked(userId))) return NextResponse.json({ error: "Brochures unlock after you download 15 photos." }, { status: 403 });
  const [brochure, shop] = await Promise.all([getBrochure(userId, parsed.data.collection), getShop(userId)]);
  if (!brochure || brochure.items.length === 0) return NextResponse.json({ error: "Choose at least one photo first." }, { status: 400 });
  const limited = await takeUse(userId, "pdf");
  if (limited) return NextResponse.json({ error: limited }, { status: 429 });

  try {
    const pdf = await brochurePdf(userId, brochure, shop);
    return new Response(new Uint8Array(pdf), { headers: { "Content-Type": "application/pdf", "Cache-Control": "private, no-store" } });
  } catch (err) {
    reportError("brochure pdf", err, { collection: parsed.data.collection });
    return NextResponse.json({ error: "Couldn’t make the PDF. Try again in a minute." }, { status: 500 });
  }
}
