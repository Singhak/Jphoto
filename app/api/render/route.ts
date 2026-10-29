import { NextResponse } from "next/server";
import { z } from "zod";
import { PIECE_TYPES, renderShot, STYLES } from "@/lib/pipeline";
import { isId, loadCutout, saveShot } from "@/lib/renders";

export const runtime = "nodejs";
export const maxDuration = 300;

const Body = z.object({
  cutoutId: z.string().refine(isId),
  piece: z.enum(PIECE_TYPES),
  styleId: z.string().refine((id) => STYLES.some((s) => s.id === id)),
});

/** Step 2: one style for one cutout. Previews are free; a credit is spent only when the full image is downloaded. */
export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Bad request" }, { status: 400 });
  const { cutoutId, piece, styleId } = parsed.data;

  try {
    const cutout = await loadCutout(cutoutId);
    const shot = await renderShot(cutout, piece, styleId);
    const id = await saveShot(shot.png);
    return NextResponse.json({
      id,
      styleId,
      accepted: shot.accepted,
      rejectReasons: shot.rejectReasons,
      psnr: Number.isFinite(shot.fidelity.psnr) ? shot.fidelity.psnr : null,
      judgeScore: shot.judge?.score ?? null,
      attempts: shot.attempts,
    });
  } catch (err) {
    console.error("render failed", err);
    return NextResponse.json({ error: "This style could not be made right now. You have not been charged." }, { status: 500 });
  }
}
