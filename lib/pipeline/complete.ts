import sharp from "sharp";
import { locatePiece, MIN_ALIGN_SCORE } from "./align";
import { geminiScene } from "./gemini";
import { placeAt, placeOnCanvas, toRgba, trimToContent } from "./images";

const SIZE = 1024;
/** Mean RGB difference (0–255) under which Gemini's pixel counts as "the same" and the original pixel is kept. */
const SAME_PIXEL = 45;
/** If more than this share of the finished piece had to be drawn by AI, the photo should be retaken instead. */
export const MAX_RECONSTRUCTED = 0.25;

export interface Completion {
  /** Trimmed RGBA PNG: original pixels wherever possible, AI pixels only where the piece was hidden. */
  png: Buffer;
  /** Share of the finished piece's pixels that came from the AI (0–1). */
  reconstructed: number;
  /** Share of the original cutout that was removed as not-jewellery (fingers, stands, props). */
  removed: number;
  alignScore: number;
  /** False when the result should not be trusted; use the plain cutout and ask for a retake. */
  ok: boolean;
  reasons: string[];
}

/**
 * Step 1b: remove anything in the cutout that is not jewellery (a finger, pen, stand) and let Gemini redraw
 * the parts of the piece those objects hid. Gemini redraws everything, so every pixel it did not need to
 * change is swapped back for the original, keeping the exact-design guarantee for all but the hidden parts.
 */
export async function completeCutout(cutout: Buffer, piece: string, segment: (png: Buffer) => Promise<Buffer>): Promise<Completion> {
  const canvas = { width: SIZE, height: SIZE };
  const placed = await placeOnCanvas(cutout, SIZE, SIZE, { maxW: 0.7, maxH: 0.7, cx: 0.5, cy: 0.5, poseHint: "" });
  const input = await sharp({ create: { width: SIZE, height: SIZE, channels: 3, background: "#ffffff" } })
    .composite([{ input: placed.layer }])
    .png()
    .toBuffer();

  const prompt = [
    `This is a cut-out photo of a ${piece}.`,
    `Remove everything that is not part of the ${piece}: fingers, hands, pens, sticks, stands, putty, tags or any prop.`,
    `Where those objects hid part of the ${piece}, complete the ${piece} naturally so it looks whole.`,
    "Do not change anything else: same design, stones, metal colour, lighting, size and position in the frame.",
    "Pure white background, no shadow, no text.",
  ].join(" ");
  const raw = await geminiScene(input, prompt, "1:1");
  const result = await sharp(raw).resize(SIZE, SIZE, { fit: "fill" }).removeAlpha().png().toBuffer();

  // Gemini may nudge the piece; find where it put it and line the original up with that.
  const match = await locatePiece(result, cutout, placed.rect, canvas);
  const original = await toRgba((await placeAt(cutout, SIZE, SIZE, match)).layer);
  // Segment Gemini's version to get the shape of the jewellery alone.
  const shape = await toRgba(await sharp(await segment(result)).resize(SIZE, SIZE, { fit: "fill" }).png().toBuffer());
  const ai = await toRgba(result);

  const out = Buffer.alloc(SIZE * SIZE * 4);
  let total = 0, fromAi = 0, before = 0, dropped = 0;
  for (let p = 0; p < SIZE * SIZE; p++) {
    const i = p * 4;
    const origA = original.data[i + 3];
    const newA = shape.data[i + 3];
    if (origA > 8) before++;
    if (newA <= 8) {
      if (origA > 8) dropped++;
      continue;
    }
    total++;
    const diff =
      (Math.abs(original.data[i] - ai.data[i]) + Math.abs(original.data[i + 1] - ai.data[i + 1]) + Math.abs(original.data[i + 2] - ai.data[i + 2])) / 3;
    const src = origA >= 200 && diff < SAME_PIXEL ? original.data : ai.data;
    if (src === ai.data) fromAi++;
    out[i] = src[i];
    out[i + 1] = src[i + 1];
    out[i + 2] = src[i + 2];
    out[i + 3] = src === original.data ? origA : newA;
  }

  const reconstructed = total ? fromAi / total : 1;
  const removed = before ? dropped / before : 0;
  const reasons: string[] = [];
  if (match.score < MIN_ALIGN_SCORE) reasons.push(`AI moved or reshaped the piece (alignment ${match.score.toFixed(2)})`);
  if (reconstructed > MAX_RECONSTRUCTED) reasons.push(`${Math.round(reconstructed * 100)}% of the piece would be drawn by AI`);
  const png = await trimToContent(await sharp(out, { raw: { width: SIZE, height: SIZE, channels: 4 } }).png().toBuffer());
  return { png, reconstructed, removed, alignScore: match.score, ok: reasons.length === 0, reasons };
}
