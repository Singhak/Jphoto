import { isId, readPreview, readShot } from "@/lib/renders";

export const runtime = "nodejs";

/**
 * GET /api/renders/{id}          watermarked preview (free)
 * GET /api/renders/{id}?full=1   full-size PNG download
 * TODO before launch: check the signed-in user owns the render and charge the credit here, not in the browser.
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isId(id)) return new Response("Not found", { status: 404 });
  const full = new URL(req.url).searchParams.has("full");
  try {
    if (full) {
      return new Response(new Uint8Array(await readShot(id)), {
        headers: { "Content-Type": "image/png", "Content-Disposition": `attachment; filename="jewellery-${id.slice(0, 8)}.png"` },
      });
    }
    return new Response(new Uint8Array(await readPreview(id)), {
      headers: { "Content-Type": "image/jpeg", "Cache-Control": "private, max-age=86400" },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
