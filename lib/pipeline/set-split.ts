import sharp from "sharp";
import type { Rect } from "./align";
import { toRgba } from "./images";

/**
 * Finds the necklace and the two earrings in the cutout of a necklace set, from the cutout's shape alone (no AI).
 * Model shots need the parts apart: the necklace goes on the neck and each earring on an ear.
 * Product shots keep the set as photographed, so they don't need this to succeed.
 */

export type SetSplit =
  | {
      ok: true;
      /** In the trimmed cutout's pixels. */
      necklace: Rect;
      /** Left to right as photographed. */
      earrings: [Rect, Rect];
    }
  | { ok: false; reason: string };

/** Alpha above this counts as jewellery when finding parts. */
const SOLID = 64;
/** Parts smaller than this share of all jewellery pixels are dust or loose stones in the mask, not pieces. */
const DUST = 0.003;
/** A second part at least this share of the necklace's size is something to account for (an earring or a prop). */
const SIGNIFICANT = 0.02;

interface Part extends Rect {
  label: number;
  area: number;
}

/** Labels connected parts. Gaps up to `bridge` px are closed first so a thin chain seen in pieces stays one part. */
function findParts(alpha: Uint8Array, width: number, height: number, bridge: number): { labels: Int32Array; parts: Part[] } {
  const solid = new Uint8Array(width * height);
  for (let i = 0; i < solid.length; i++) solid[i] = alpha[i] > SOLID ? 1 : 0;

  // Dilate with a square of side 2*bridge+1, done as two 1-D passes using running counts.
  const rows = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    let count = 0;
    for (let x = -bridge; x < width; x++) {
      const add = x + bridge;
      if (add < width) count += solid[y * width + add];
      const drop = x - bridge - 1;
      if (drop >= 0) count -= solid[y * width + drop];
      if (x >= 0) rows[y * width + x] = count > 0 ? 1 : 0;
    }
  }
  const grown = new Uint8Array(width * height);
  for (let x = 0; x < width; x++) {
    let count = 0;
    for (let y = -bridge; y < height; y++) {
      const add = y + bridge;
      if (add < height) count += rows[add * width + x];
      const drop = y - bridge - 1;
      if (drop >= 0) count -= rows[drop * width + x];
      if (y >= 0) grown[y * width + x] = count > 0 ? 1 : 0;
    }
  }

  // Flood-fill the grown mask; measure each part on the real (ungrown) pixels.
  const labels = new Int32Array(width * height).fill(-1);
  const parts: Part[] = [];
  const stack: number[] = [];
  for (let start = 0; start < grown.length; start++) {
    if (!grown[start] || labels[start] !== -1) continue;
    const label = parts.length;
    let minX = width, minY = height, maxX = -1, maxY = -1, area = 0;
    labels[start] = label;
    stack.push(start);
    while (stack.length) {
      const i = stack.pop()!;
      const x = i % width, y = (i - x) / width;
      if (solid[i]) {
        area++;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
          const j = ny * width + nx;
          if (grown[j] && labels[j] === -1) {
            labels[j] = label;
            stack.push(j);
          }
        }
      }
    }
    parts.push({ label, area, left: minX, top: minY, width: maxX - minX + 1, height: maxY - minY + 1 });
  }
  return { labels, parts };
}

async function alphaOf(png: Buffer) {
  const img = await toRgba(png);
  const alpha = new Uint8Array(img.width * img.height);
  for (let i = 0; i < alpha.length; i++) alpha[i] = img.data[i * 4 + 3];
  return { alpha, width: img.width, height: img.height };
}

const bridgeFor = (width: number, height: number) => Math.max(2, Math.round(Math.max(width, height) * 0.012));

export async function splitSet(cutout: Buffer): Promise<SetSplit> {
  const { alpha, width, height } = await alphaOf(cutout);
  const { parts } = findParts(alpha, width, height, bridgeFor(width, height));
  const total = parts.reduce((sum, p) => sum + p.area, 0);
  const real = parts.filter((p) => p.area >= total * DUST).sort((a, b) => b.area - a.area);
  if (real.length === 0) return { ok: false, reason: "No jewellery found in the cutout." };

  const [necklace, ...rest] = real;
  const others = rest.filter((p) => p.area >= necklace.area * SIGNIFICANT);
  const apart = "Lay the necklace and both earrings on the tray with a little space between them.";
  if (others.length === 0) return { ok: false, reason: `Couldn't find the earrings apart from the necklace. ${apart}` };
  if (others.length === 1) return { ok: false, reason: `Found only one earring, or the two earrings are touching. ${apart}` };
  if (others.length > 2) {
    return { ok: false, reason: `Found ${others.length + 1} separate things instead of a necklace and two earrings. Take out stands, tags and anything else that isn't the set.` };
  }

  // Parts that don't make a necklace and a matching pair almost always mean something else is stuck to them,
  // like an earring stand or the tray's edge, so say that rather than guess which piece is which.
  const [a, b] = others;
  const pairLike = Math.min(a.area, b.area) / Math.max(a.area, b.area) >= 0.6 && Math.min(a.height, b.height) / Math.max(a.height, b.height) >= 0.75;
  if (!pairLike || Math.max(a.area, b.area) > necklace.area * 0.6) {
    return { ok: false, reason: "Couldn't find the necklace and a matching pair of earrings. Only the set should be in the photo: no stands, tags or tray edges." };
  }

  const rect = ({ left, top, width, height }: Part): Rect => ({ left, top, width, height });
  const pair = [a, b].sort((p, q) => p.left - q.left);
  return { ok: true, necklace: rect(necklace), earrings: [rect(pair[0]), rect(pair[1])] };
}

/** One part of the set as its own trimmed cutout, with the other parts cleared even where their boxes overlap. */
export async function extractPart(cutout: Buffer, part: Rect): Promise<Buffer> {
  const img = await toRgba(cutout);
  const alpha = new Uint8Array(img.width * img.height);
  for (let i = 0; i < alpha.length; i++) alpha[i] = img.data[i * 4 + 3];
  const { labels, parts } = findParts(alpha, img.width, img.height, bridgeFor(img.width, img.height));
  // The part whose real pixels gave exactly this box.
  const own = parts.find((p) => p.left === part.left && p.top === part.top && p.width === part.width && p.height === part.height);
  if (!own) throw new Error("Set part not found in this cutout");

  const out = Buffer.alloc(part.width * part.height * 4);
  for (let y = 0; y < part.height; y++) {
    for (let x = 0; x < part.width; x++) {
      const src = (part.top + y) * img.width + part.left + x;
      const dst = (y * part.width + x) * 4;
      if (labels[src] !== own.label) continue;
      img.data.copy(out, dst, src * 4, src * 4 + 4);
    }
  }
  return sharp(out, { raw: { width: part.width, height: part.height, channels: 4 } }).png().toBuffer();
}
