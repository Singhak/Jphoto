import sharp, { type OverlayOptions } from "sharp";
import type { Rect } from "./align";
import type { Placement } from "./presets";

export interface Rgba {
  data: Buffer;
  width: number;
  height: number;
}

export async function toRgba(buf: Buffer): Promise<Rgba> {
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
}

function fromRgba(img: Rgba) {
  return sharp(img.data, { raw: { width: img.width, height: img.height, channels: 4 } });
}

/**
 * Fix phone orientation and cap the size. Pixels are otherwise untouched so the gold tone stays true.
 * The pixel limit stops a small file that decodes to a huge image. 120 MP leaves room for 108 MP phone cameras.
 */
export async function prepareInput(buf: Buffer): Promise<Buffer> {
  return sharp(buf, { limitInputPixels: 120_000_000 }).rotate().resize({ width: 2048, height: 2048, fit: "inside", withoutEnlargement: true }).png().toBuffer();
}

/** True if the image already has a transparent background (e.g. a PNG cutout from the jeweller). */
export async function hasTransparentBackground(buf: Buffer): Promise<boolean> {
  const meta = await sharp(buf).metadata();
  if (!meta.hasAlpha) return false;
  const { data } = await toRgba(buf);
  let clear = 0;
  for (let i = 3; i < data.length; i += 4) if (data[i] < 10) clear++;
  return clear / (data.length / 4) > 0.05;
}

/** Crop a cutout to the bounding box of its visible pixels. */
export async function trimToContent(cutout: Buffer): Promise<Buffer> {
  const img = await toRgba(cutout);
  let minX = img.width, minY = img.height, maxX = -1, maxY = -1;
  for (let y = 0; y < img.height; y++) {
    for (let x = 0; x < img.width; x++) {
      if (img.data[(y * img.width + x) * 4 + 3] > 8) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) throw new Error("Segmentation found no jewellery in the photo");
  return fromRgba(img).extract({ left: minX, top: minY, width: maxX - minX + 1, height: maxY - minY + 1 }).png().toBuffer();
}

export interface MaskReport {
  /** Share of the photo covered by the jewellery. Very small values usually mean segmentation missed the piece. */
  coverage: number;
  /** Share of the jewellery outline that is semi-transparent. High values mean a fuzzy, unreliable cutout. */
  softEdgeRatio: number;
}

export async function maskReport(cutout: Buffer): Promise<MaskReport> {
  const { data } = await toRgba(cutout);
  let solid = 0, soft = 0;
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] >= 245) solid++;
    else if (data[i] > 10) soft++;
  }
  return { coverage: (solid + soft) / (data.length / 4), softEdgeRatio: soft / Math.max(1, solid + soft) };
}

export interface InputQuality {
  /** Shortest side of the uploaded photo in pixels. */
  shortSide: number;
  /** Variance of the Laplacian over the jewellery at 1024px. Low values mean a blurry photo. */
  sharpness: number;
  /** The piece runs off the edge of the photo, so part of it is missing. */
  touchesEdge: boolean;
  /** Share of the jewellery that is blown-out white (glare or a flash reflection), 0 to 1. */
  glare: number;
}

/** Cheap checks on the upload, run before any paid AI call. */
export async function inputQuality(prepared: Buffer, rawCutout: Buffer): Promise<InputQuality> {
  const meta = await sharp(prepared).metadata();
  const shortSide = Math.min(meta.width!, meta.height!);
  const scale = Math.min(1, 1024 / Math.max(meta.width!, meta.height!));
  const width = Math.round(meta.width! * scale), height = Math.round(meta.height! * scale);
  const g = (await sharp(prepared).resize(width, height).removeAlpha().greyscale().raw().toBuffer()) as Buffer;
  const a = (await sharp(rawCutout).resize(width, height, { fit: "fill" }).ensureAlpha().extractChannel(3).raw().toBuffer()) as Buffer;

  let sum = 0, sq = 0, n = 0, blown = 0;
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = y * width + x;
      if (a[i] < 200) continue;
      if (g[i] >= 250) blown++;
      const lap = g[i - 1] + g[i + 1] + g[i - width] + g[i + width] - 4 * g[i];
      sum += lap;
      sq += lap * lap;
      n++;
    }
  }
  const sharpness = n ? sq / n - (sum / n) ** 2 : 0;

  let edge = 0, border = 0;
  for (let x = 0; x < width; x++) for (const y of [0, height - 1]) { border++; if (a[y * width + x] > 128) edge++; }
  for (let y = 0; y < height; y++) for (const x of [0, width - 1]) { border++; if (a[y * width + x] > 128) edge++; }

  return { shortSide, sharpness, touchesEdge: edge / border > 0.01, glare: n ? blown / n : 0 };
}

export interface PlacedLayer {
  /** Canvas-sized RGBA PNG holding only the jewellery at its final position. */
  layer: Buffer;
  width: number;
  height: number;
  /** Where the piece sits on the canvas. */
  rect: Rect;
}

/** Scale the trimmed cutout into its slot on a transparent canvas. Upscaling is capped at 2x to avoid blur. */
export async function placeOnCanvas(trimmed: Buffer, width: number, height: number, p: Placement): Promise<PlacedLayer> {
  const meta = await sharp(trimmed).metadata();
  const scale = Math.min((p.maxW * width) / meta.width!, (p.maxH * height) / meta.height!, 2);
  const w = Math.max(1, Math.round(meta.width! * scale));
  const h = Math.max(1, Math.round(meta.height! * scale));
  const left = Math.min(Math.max(0, Math.round(p.cx * width - w / 2)), width - w);
  const top = Math.min(Math.max(0, Math.round(p.cy * height - h / 2)), height - h);
  return placeAt(trimmed, width, height, { left, top, width: w, height: h });
}

/** Put the trimmed cutout at an exact rectangle, e.g. where alignment found the AI placed it. */
export async function placeAt(trimmed: Buffer, width: number, height: number, rect: Rect): Promise<PlacedLayer> {
  const piece = await sharp(trimmed).resize(rect.width, rect.height, { kernel: "lanczos3", fit: "fill" }).png().toBuffer();
  const layer = await sharp({ create: { width, height, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: piece, left: rect.left, top: rect.top }])
    .png()
    .toBuffer();
  return { layer, width, height, rect };
}

/**
 * Inputs for the AI fill step: the jewellery on a neutral grey canvas so the model can see it,
 * and a mask that is white everywhere except the solid jewellery pixels.
 */
export async function fillInputs(placed: PlacedLayer): Promise<{ image: Buffer; mask: Buffer }> {
  const { width, height } = placed;
  const image = await sharp({ create: { width, height, channels: 3, background: "#808080" } })
    .composite([{ input: placed.layer }])
    .png()
    .toBuffer();
  const { data } = await toRgba(placed.layer);
  const mask = Buffer.alloc(width * height);
  for (let i = 0; i < mask.length; i++) mask[i] = data[i * 4 + 3] >= 250 ? 0 : 255;
  return { image, mask: await sharp(mask, { raw: { width, height, channels: 1 } }).png().toBuffer() };
}

/** Soft contact shadow under the piece, used for the plain local backgrounds. */
async function shadowFor(placed: PlacedLayer): Promise<Buffer> {
  const { data } = await toRgba(placed.layer);
  const { width, height } = placed;
  const blur = Math.max(4, Math.round(width / 120));
  const dy = Math.round(blur * 1.2);
  // Copy the piece's alpha shifted down by dy rows, as black at 28% strength.
  const shadow = Buffer.alloc(data.length);
  for (let y = dy; y < height; y++) {
    for (let x = 0; x < width; x++) {
      shadow[(y * width + x) * 4 + 3] = Math.round(data[((y - dy) * width + x) * 4 + 3] * 0.28);
    }
  }
  return sharp(shadow, { raw: { width, height, channels: 4 } }).blur(blur).png().toBuffer();
}

/** Final composite: background, optional shadow, then the untouched original jewellery pixels on top. */
export async function compositeFinal(background: Buffer, placed: PlacedLayer, withShadow: boolean): Promise<Buffer> {
  const bg = await sharp(background).resize(placed.width, placed.height, { fit: "fill" }).removeAlpha().png().toBuffer();
  const layers: OverlayOptions[] = [];
  if (withShadow) layers.push({ input: await shadowFor(placed) });
  layers.push({ input: placed.layer });
  return sharp(bg).composite(layers).png().toBuffer();
}

export async function solidBackground(width: number, height: number, color: string): Promise<Buffer> {
  return sharp({ create: { width, height, channels: 3, background: color } }).png().toBuffer();
}

/** Side-by-side "uploaded vs result" image for reviewing with jewellers. */
export async function sideBySide(original: Buffer, result: Buffer, height = 900): Promise<Buffer> {
  const a = await sharp(original).resize({ height }).flatten({ background: "#ffffff" }).png().toBuffer();
  const b = await sharp(result).resize({ height }).png().toBuffer();
  const [ma, mb] = await Promise.all([sharp(a).metadata(), sharp(b).metadata()]);
  const gap = 24;
  return sharp({ create: { width: ma.width! + mb.width! + gap, height, channels: 3, background: "#ffffff" } })
    .composite([{ input: a, left: 0, top: 0 }, { input: b, left: ma.width! + gap, top: 0 }])
    .jpeg({ quality: 88 })
    .toBuffer();
}
