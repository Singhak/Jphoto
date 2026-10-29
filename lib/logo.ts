import sharp from "sharp";
import type { LogoTone } from "./brochure";
import { storage } from "./storage";

/** The shop's logo, shown on brochures and share frames. One per shop, at a fixed key; a new one replaces it. */

const key = (userId: string) => `users/${userId}/logo.png`;

/** Big enough for an A4 cover, small enough to load fast in share frames. */
const MAX_SIDE = 800;

/**
 * Cleans up an uploaded logo: turns it upright, trims plain margins, shrinks it and saves it as PNG.
 * Returns how it reads, so dark logos get a light badge on dark backgrounds and the other way round.
 */
export async function saveLogo(userId: string, upload: Buffer): Promise<LogoTone> {
  let img = sharp(upload, { limitInputPixels: 40_000_000 }).rotate();
  try {
    img = sharp(await img.trim({ threshold: 12 }).toBuffer());
  } catch {
    // Nothing to trim (one flat colour); keep it as it is.
  }
  const png = await img.resize({ width: MAX_SIDE, height: MAX_SIDE, fit: "inside", withoutEnlargement: true }).png().toBuffer();
  const tone = await toneOf(png);
  await storage.put(key(userId), png, "image/png");
  return tone;
}

export const readLogo = (userId: string) => storage.get(key(userId));

/** Average brightness of the logo's visible marks. A logo with hardly any see-through pixels is a solid picture. */
async function toneOf(png: Buffer): Promise<LogoTone> {
  const { data, info } = await sharp(png).ensureAlpha().resize({ width: 200, height: 200, fit: "inside" }).raw().toBuffer({ resolveWithObject: true });
  let seen = 0, clear = 0, light = 0;
  for (let i = 0; i < data.length; i += info.channels) {
    const a = data[i + 3];
    if (a < 128) {
      clear++;
      continue;
    }
    seen++;
    light += (0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]) / 255;
  }
  if (clear / (seen + clear) < 0.05) return "solid";
  return light / Math.max(seen, 1) > 0.6 ? "light" : "dark";
}
