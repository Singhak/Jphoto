import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { BRAND } from "./brand";
import type { Cutout } from "./pipeline";

/**
 * Local disk storage for cutouts and finished shots, until Supabase Storage replaces it.
 * Kept under .cache, which is git-ignored because these are jewellers' private photos.
 */
const DIR = path.join(process.cwd(), ".cache", "renders");
const ID = /^[0-9a-f-]{36}$/;

export const newId = () => randomUUID();
export const isId = (id: string) => ID.test(id);

function file(id: string, suffix: string) {
  if (!isId(id)) throw new Error("Bad id");
  return path.join(DIR, `${id}${suffix}`);
}

export async function saveCutout(cutout: Cutout): Promise<string> {
  const id = newId();
  await mkdir(DIR, { recursive: true });
  // rawPng is only for debugging the completion step; it is not needed to render.
  const { png, mask, quality, problems, warnings, completion } = cutout;
  const meta = { mask, quality, problems, warnings, completion };
  await Promise.all([writeFile(file(id, ".cutout.png"), png), writeFile(file(id, ".cutout.json"), JSON.stringify(meta))]);
  return id;
}

export async function loadCutout(id: string): Promise<Cutout> {
  const [png, meta] = await Promise.all([readFile(file(id, ".cutout.png")), readFile(file(id, ".cutout.json"), "utf8")]);
  return { ...JSON.parse(meta), png, rawPng: png };
}

export async function saveShot(png: Buffer): Promise<string> {
  const id = newId();
  await mkdir(DIR, { recursive: true });
  await Promise.all([writeFile(file(id, ".png"), png), writeFile(file(id, ".preview.jpg"), await preview(png))]);
  return id;
}

export const readShot = (id: string) => readFile(file(id, ".png"));
export const readPreview = (id: string) => readFile(file(id, ".preview.jpg"));

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

export const readCutout = (id: string) => readFile(file(id, ".cutout.png"));
