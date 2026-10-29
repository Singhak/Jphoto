import { canDownload } from "@/lib/account";
import { currentUserId } from "@/lib/auth";
import { isId, readPreview, readShot } from "@/lib/renders";

export const runtime = "nodejs";

/**
 * GET /api/renders/{id}          watermarked preview (free)
 * GET /api/renders/{id}?full=1   full-size PNG, only after POST /api/downloads has charged for it
 * Files are stored under the owner's id, so another account's ids are simply not found.
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await currentUserId();
  const { id } = await params;
  if (!userId || !isId(id)) return new Response("Not found", { status: 404 });
  const full = new URL(req.url).searchParams.has("full");
  try {
    if (full) {
      if (!(await canDownload(userId, id))) return new Response("Not paid for", { status: 402 });
      return new Response(new Uint8Array(await readShot(userId, id)), {
        headers: { "Content-Type": "image/png", "Content-Disposition": `attachment; filename="jewellery-${id.slice(0, 8)}.png"` },
      });
    }
    return new Response(new Uint8Array(await readPreview(userId, id)), {
      headers: { "Content-Type": "image/jpeg", "Cache-Control": "private, max-age=86400" },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
