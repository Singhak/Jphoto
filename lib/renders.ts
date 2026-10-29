import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { BRAND } from "./brand";
import type { Cutout } from "./pipeline";
import { storage } from "./storage";

/**
 * Cutouts and finished shots, stored per user (see lib/storage.ts for where).
 * Keys start with the owner's id, so a file can only be found by the account that made it.
 */
const ID = /^[0-9a-f-]{36}$/;

export const newId = () => randomUUID();
export const isId = (id: string) => ID.test(id);

function key(userId: string, kind: "cutouts" | "renders", id: string, suffix: string) {
  if (!isId(id)) throw new Error("Bad id");
  return `users/${userId}/${kind}/${id}${suffix}`;
}

export async function saveCutout(userId: string, cutout: Cutout): Promise<string> {
  const id = newId();
  // rawPng is only for debugging the completion step; it is not needed to render.
  const { png, mask, quality, problems, warnings, completion } = cutout;
  const meta = { mask, quality, problems, warnings, completion };
  await Promise.all([
    storage.put(key(userId, "cutouts", id, ".png"), png, "image/png"),
    storage.put(key(userId, "cutouts", id, ".json"), Buffer.from(JSON.stringify(meta)), "application/json"),
  ]);
  return id;
}

export async function loadCutout(userId: string, id: string): Promise<Cutout> {
  const [png, meta] = await Promise.all([readCutout(userId, id), storage.get(key(userId, "cutouts", id, ".json"))]);
  return { ...JSON.parse(meta.toString("utf8")), png, rawPng: png };
}

export const readCutout = (userId: string, id: string) => storage.get(key(userId, "cutouts", id, ".png"));

export async function saveShot(userId: string, png: Buffer): Promise<string> {
  const id = newId();
  await Promise.all([
    storage.put(key(userId, "renders", id, ".png"), png, "image/png"),
    storage.put(key(userId, "renders", id, ".preview.jpg"), await preview(png), "image/jpeg"),
  ]);
  return id;
}

export const readShot = (userId: string, id: string) => storage.get(key(userId, "renders", id, ".png"));
export const readPreview = (userId: string, id: string) => storage.get(key(userId, "renders", id, ".preview.jpg"));

/** Smaller, watermarked copy shown before the jeweller spends a credit. */
async function preview(png: Buffer): Promise<Buffer> {
  const width = 640;
  const resized = await sharp(png).resize({ width }).toBuffer({ resolveWithObject: true });
  const { height } = resized.info;
  const marks = Array.from({ length: 7 }, (_, i) => {
    const y = (height / 6) * i;
    return `<text x="${width / 2}" y="${y}" transform="rotate(-24 ${width / 2} ${y})">${BRAND.name.toUpperCase()} · PREVIEW</text>`;
  }).join("");
  const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <style>text{font:600 26px sans-serif;letter-spacing:6px;fill:rgba(255,255,255,0.38);stroke:rgba(0,0,0,0.12);stroke-width:1;text-anchor:middle}</style>${marks}</svg>`;
  return sharp(resized.data).composite([{ input: Buffer.from(svg) }]).jpeg({ quality: 82 }).toBuffer();
}
