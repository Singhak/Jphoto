import { NextResponse } from "next/server";
import { currentUserId, unauthorized } from "@/lib/auth";
import { takeUse } from "@/lib/limits";
import { extractJewellery, PIECE_TYPES, type PieceType } from "@/lib/pipeline";
import { saveCutout } from "@/lib/renders";
import { reportError, reportWarning } from "@/lib/report";
import { trackSpend } from "@/lib/spend";

export const runtime = "nodejs";
export const maxDuration = 120;

const MAX_BYTES = 15 * 1024 * 1024;

/** Step 1: cut the piece out of the photo and run the photo checks. Free: no credit is used. */
export async function POST(req: Request) {
  const userId = await currentUserId();
  if (!userId) return unauthorized();
  const form = await req.formData();
  const photo = form.get("photo");
  const piece = String(form.get("piece") ?? "");
  if (!(photo instanceof File)) return NextResponse.json({ error: "Add a photo of the piece." }, { status: 400 });
  if (photo.size > MAX_BYTES) return NextResponse.json({ error: "Photo is larger than 15 MB." }, { status: 400 });
  // Optional: the check starts as soon as a photo is dropped, often before the jeweller has said what it is.
  if (piece && !(PIECE_TYPES as readonly string[]).includes(piece)) return NextResponse.json({ error: "Unknown piece type." }, { status: 400 });
  const limited = await takeUse(userId, "check");
  if (limited) return NextResponse.json({ error: limited }, { status: 429 });

  try {
    const input = Buffer.from(await photo.arrayBuffer());
    const cutout = await trackSpend(userId, "check", undefined, () => extractJewellery(input, { piece: (piece || undefined) as PieceType | undefined }));
    const cutoutId = await saveCutout(userId, cutout);
    // Outages on our side are logged, not shown: they aren't about the jeweller's photo.
    const internal = cutout.warnings.filter((w) => w.startsWith("Prop check skipped"));
    if (internal.length) reportWarning("extract", internal.join("; "));
    const warnings = cutout.warnings.filter((w) => !internal.includes(w));
    // Drop API error details like "(Gemini … failed (429): …)" from what the jeweller reads.
    const apiDetail = /\s*\([^()]*failed \(\d+\)[^()]*\)/g;
    if (cutout.problems.some((p) => /failed \(\d+\)/.test(p))) reportWarning("extract", cutout.problems.join("; "));
    const problems = cutout.problems.map((p) => p.replace(apiDetail, ""));
    return NextResponse.json({ cutoutId, problems, warnings });
  } catch (err) {
    reportError("extract", err, { piece });
    return NextResponse.json({ error: "We couldn't read this photo. Try a JPG or PNG taken with your phone camera." }, { status: 500 });
  }
}
