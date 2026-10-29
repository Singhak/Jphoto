import { toRgba } from "./images";

export interface FidelityResult {
  passed: boolean;
  /** Peak signal-to-noise ratio over the solid jewellery pixels. Infinity means identical. */
  psnr: number;
  /** Largest single-channel difference (0–255) on any jewellery pixel. */
  maxDiff: number;
  /** Number of jewellery pixels compared. */
  pixels: number;
}

/** Minimum PSNR for a pass. Above ~45 dB the difference is invisible even when zoomed in. */
export const MIN_PSNR = 45;

/**
 * Checks that the jewellery pixels in the final image match the original cutout.
 * Only fully opaque cutout pixels are compared; soft edges are blended with the new background by design.
 * This guards the "design unchanged" promise against anything later in the pipeline
 * (harmonisation, resizing, encoding) that could alter the piece.
 */
export async function checkFidelity(placedLayer: Buffer, finalImage: Buffer): Promise<FidelityResult> {
  const [ref, out] = await Promise.all([toRgba(placedLayer), toRgba(finalImage)]);
  if (ref.width !== out.width || ref.height !== out.height) {
    return { passed: false, psnr: 0, maxDiff: 255, pixels: 0 };
  }
  let sqSum = 0, maxDiff = 0, pixels = 0;
  for (let i = 0; i < ref.data.length; i += 4) {
    if (ref.data[i + 3] !== 255) continue;
    pixels++;
    for (let c = 0; c < 3; c++) {
      const d = Math.abs(ref.data[i + c] - out.data[i + c]);
      sqSum += d * d;
      if (d > maxDiff) maxDiff = d;
    }
  }
  if (pixels === 0) return { passed: false, psnr: 0, maxDiff: 255, pixels };
  const mse = sqSum / (pixels * 3);
  const psnr = mse === 0 ? Infinity : 10 * Math.log10((255 * 255) / mse);
  return { passed: psnr >= MIN_PSNR, psnr, maxDiff, pixels };
}
