import { NextResponse } from "next/server";
import { extractJewellery, PIECE_TYPES, type PieceType } from "@/lib/pipeline";
import { saveCutout } from "@/lib/renders";

export const runtime = "nodejs";
export const maxDuration = 120;

const MAX_BYTES = 15 * 1024 * 1024;

/** Step 1: cut the piece out of the photo and run the photo checks. Free: no credit is used. */
export async function POST(req: Request) {
  const form = await req.formData();
  const photo = form.get("photo");
  const piece = String(form.get("piece") ?? "");
  if (!(photo instanceof File)) return NextResponse.json({ error: "Add a photo of the piece." }, { status: 400 });
  if (photo.size > MAX_BYTES) return NextResponse.json({ error: "Photo is larger than 15 MB." }, { status: 400 });
  // Optional: the check starts as soon as a photo is dropped, often before the jeweller has said what it is.
  if (piece && !(PIECE_TYPES as readonly string[]).includes(piece)) return NextResponse.json({ error: "Unknown piece type." }, { status: 400 });

  try {
    const cutout = await extractJewellery(Buffer.from(await photo.arrayBuffer()), { piece: (piece || undefined) as PieceType | undefined });
    const cutoutId = await saveCutout(cutout);
    // Outages on our side are logged, not shown: they aren't about the jeweller's photo.
    const internal = cutout.warnings.filter((w) => w.startsWith("Prop check skipped"));
    if (internal.length) console.warn("extract:", internal.join("; "));
    const warnings = cutout.warnings.filter((w) => !internal.includes(w));
    // Drop API error details like "(Gemini … failed (429): …)" from what the jeweller reads.
    const apiDetail = /\s*\([^()]*failed \(\d+\)[^()]*\)/g;
    if (cutout.problems.some((p) => /failed \(\d+\)/.test(p))) console.warn("extract:", cutout.problems.join("; "));
    const problems = cutout.problems.map((p) => p.replace(apiDetail, ""));
    return NextResponse.json({ cutoutId, problems, warnings });
  } catch (err) {
    console.error("extract failed", err);
    return NextResponse.json({ error: "We couldn't read this photo. Try a JPG or PNG taken with your phone camera." }, { status: 500 });
  }
}
