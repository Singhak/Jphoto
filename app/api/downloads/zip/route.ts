import { paidCreations } from "@/lib/account";
import { currentUserId } from "@/lib/auth";
import { pieceLabel } from "@/lib/catalog";
import { type PieceType, STYLES } from "@/lib/pipeline/presets";
import { isId, readShot } from "@/lib/renders";
import { reportError } from "@/lib/report";
import { zipStream } from "@/lib/zip";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * POST /api/downloads/zip   form field "ids": comma-separated photo ids, all already paid for with POST /api/downloads.
 * Sent as a plain form so the browser saves the zip itself as it arrives, instead of holding it in page memory.
 * Photos are grouped in a folder per collection.
 */
export async function POST(req: Request) {
  const userId = await currentUserId();
  if (!userId) return new Response("Please sign in again.", { status: 401 });
  const ids = [...new Set(String((await req.formData().catch(() => null))?.get("ids") ?? "").split(","))].filter(isId);
  if (ids.length === 0 || ids.length > 500) return new Response("Bad request", { status: 400 });

  const rows = await paidCreations(userId, ids);
  if (rows.length !== ids.length) return new Response("Some of these photos are not paid for yet.", { status: 402 });

  const entries = rows.map((r) => {
    const style = STYLES.find((s) => s.id === r.styleId)?.label ?? r.styleId;
    const name = [r.designCode, r.designName || pieceLabel(r.piece as PieceType), style, r.id.slice(0, 8)].filter(Boolean).join(" - ");
    return { name: `${safe(r.collection)}/${safe(name)}.png`, read: () => readShot(userId, r.id) };
  });
  const collections = new Set(rows.map((r) => r.collection));
  const title = collections.size === 1 ? safe(rows[0].collection) : "Jewellery photos";
  const ascii = title.replace(/[^\x20-\x7e]+/g, "").trim() || "jewellery-photos";

  const body = zipStream(entries, (err) => reportError("download zip", err, { photos: ids.length }));
  return new Response(body, {
    headers: {
      "Content-Type": "application/zip",
      // filename* keeps Indian-script collection names; older browsers fall back to the plain one.
      "Content-Disposition": `attachment; filename="${ascii.replace(/"/g, "")}.zip"; filename*=UTF-8''${encodeURIComponent(title)}.zip`,
      "Cache-Control": "private, no-store",
    },
  });
}

/** Keeps any script, drops characters that Windows, macOS or phones won't allow in a file or folder name. */
const safe = (s: string) => s.replace(/[\\/:*?"<>|\x00-\x1f]+/g, "-").replace(/\s+/g, " ").trim().replace(/^\.+/, "").slice(0, 80) || "Photos";
