import { NextResponse } from "next/server";
import { getShop, setLogo } from "@/lib/account";
import { currentUserId, unauthorized } from "@/lib/auth";
import { readLogo, saveLogo } from "@/lib/logo";

export const runtime = "nodejs";

const MAX_BYTES = 5 * 1024 * 1024;

/** GET /api/account/logo?v={version}  the signed-in shop's logo. The version in the URL changes with each new logo. */
export async function GET() {
  const userId = await currentUserId();
  if (!userId) return new Response("Not found", { status: 404 });
  const { logoTone } = await getShop(userId);
  if (!logoTone) return new Response("Not found", { status: 404 });
  try {
    return new Response(new Uint8Array(await readLogo(userId)), { headers: { "Content-Type": "image/png", "Cache-Control": "private, max-age=31536000, immutable" } });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}

/** Upload a logo as form field "logo": JPG, PNG or WebP, up to 5 MB. */
export async function POST(req: Request) {
  const userId = await currentUserId();
  if (!userId) return unauthorized();
  const file = (await req.formData().catch(() => null))?.get("logo");
  if (!(file instanceof File)) return NextResponse.json({ error: "Choose an image file." }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "That file is over 5 MB. Use a smaller image." }, { status: 413 });
  if (!/^image\/(png|jpeg|webp)$/.test(file.type)) return NextResponse.json({ error: "Use a PNG, JPG or WebP image." }, { status: 415 });
  try {
    const tone = await saveLogo(userId, Buffer.from(await file.arrayBuffer()));
    return NextResponse.json({ logoTone: tone, logoVersion: await setLogo(userId, tone) });
  } catch {
    return NextResponse.json({ error: "Couldn’t read that image. Try a PNG or JPG." }, { status: 400 });
  }
}

export async function DELETE() {
  const userId = await currentUserId();
  if (!userId) return unauthorized();
  return NextResponse.json({ logoTone: "", logoVersion: await setLogo(userId, "") });
}
