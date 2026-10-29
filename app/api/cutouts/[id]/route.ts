import { isId, readCutout } from "@/lib/renders";

export const runtime = "nodejs";

/** The jeweller's piece cut out on a transparent background, used to preview it on each look before anything is made. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isId(id)) return new Response("Not found", { status: 404 });
  try {
    return new Response(new Uint8Array(await readCutout(id)), { headers: { "Content-Type": "image/png", "Cache-Control": "private, max-age=86400" } });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
