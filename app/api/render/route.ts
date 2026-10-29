import { NextResponse } from "next/server";
import { z } from "zod";
import { addCreation } from "@/lib/account";
import { currentUserId, unauthorized } from "@/lib/auth";
import { MODEL_LOOKS_ON } from "@/lib/catalog";
import { takeFree } from "@/lib/limits";
import { PIECE_TYPES, renderShot, STYLES } from "@/lib/pipeline";
import { isId, loadCutout, saveShot } from "@/lib/renders";
import { reportError } from "@/lib/report";

export const runtime = "nodejs";
export const maxDuration = 300;

const Body = z.object({
  cutoutId: z.string().refine(isId),
  piece: z.enum(PIECE_TYPES),
  styleId: z.string().refine((id) => STYLES.some((s) => s.id === id && (MODEL_LOOKS_ON || s.kind !== "model"))),
  collection: z.string().trim().min(1).max(120),
});

/** Step 2: one style for one cutout. Previews are free; a credit is spent only when the full image is downloaded. */
export async function POST(req: Request) {
  const userId = await currentUserId();
  if (!userId) return unauthorized();
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Bad request" }, { status: 400 });
  const { cutoutId, piece, styleId, collection } = parsed.data;
  const limited = await takeFree(userId, "preview", `${cutoutId}:${styleId}`);
  if (limited) return NextResponse.json({ error: limited, limited: true }, { status: 429 });

  try {
    const cutout = await loadCutout(userId, cutoutId);
    const shot = await renderShot(cutout, piece, styleId);
    const stats = {
      styleId,
      accepted: shot.accepted,
      rejectReasons: shot.rejectReasons,
      psnr: Number.isFinite(shot.fidelity.psnr) ? shot.fidelity.psnr : null,
      judgeScore: shot.judge?.score ?? null,
      attempts: shot.attempts,
    };
    // Shots that fail the checks are never shown or charged, so they are not kept.
    if (!shot.accepted) return NextResponse.json(stats);
    const id = await saveShot(userId, shot.png);
    const creation = await addCreation(userId, { id, piece, styleId, collection });
    return NextResponse.json({ ...stats, id, creation });
  } catch (err) {
    reportError("render", err, { piece, styleId });
    return NextResponse.json({ error: "This style could not be made right now. You have not been charged." }, { status: 500 });
  }
}
