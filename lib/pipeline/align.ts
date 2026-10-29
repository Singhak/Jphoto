import sharp from "sharp";

export interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface Match extends Rect {
  /** Masked normalised cross-correlation, -1..1. Above ~0.6 means the piece was found. */
  score: number;
}

/** Minimum match score to trust the alignment. Below this, the AI moved or reshaped the piece too much. */
export const MIN_ALIGN_SCORE = 0.6;

interface Gray {
  data: Float32Array;
  width: number;
  height: number;
}

async function gray(buf: Buffer, width: number, height: number): Promise<Gray> {
  const { data } = await sharp(buf).resize(width, height, { fit: "fill" }).removeAlpha().greyscale().raw().toBuffer({ resolveWithObject: true });
  return { data: Float32Array.from(data), width, height };
}

async function template(piece: Buffer, width: number, height: number) {
  const { data } = await sharp(piece).resize(width, height, { fit: "fill" }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const xs: number[] = [], ys: number[] = [], vs: number[] = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      if (data[i + 3] < 200) continue;
      xs.push(x);
      ys.push(y);
      vs.push(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
    }
  }
  const mean = vs.reduce((a, b) => a + b, 0) / Math.max(1, vs.length);
  const centred = vs.map((v) => v - mean);
  const norm = Math.sqrt(centred.reduce((a, b) => a + b * b, 0));
  return { xs, ys, centred, norm };
}

/** Masked NCC of the template placed at (ox, oy) in the scene. */
function ncc(scene: Gray, t: Awaited<ReturnType<typeof template>>, ox: number, oy: number): number {
  const n = t.xs.length;
  if (n < 20 || t.norm === 0) return -1;
  let sum = 0;
  for (let k = 0; k < n; k++) sum += scene.data[(oy + t.ys[k]) * scene.width + ox + t.xs[k]];
  const mean = sum / n;
  let cross = 0, sq = 0;
  for (let k = 0; k < n; k++) {
    const s = scene.data[(oy + t.ys[k]) * scene.width + ox + t.xs[k]] - mean;
    cross += s * t.centred[k];
    sq += s * s;
  }
  return sq === 0 ? -1 : cross / (Math.sqrt(sq) * t.norm);
}

async function search(scene: Gray, piece: Buffer, aspect: number, widths: number[], cx: number, cy: number, radius: number, step: number): Promise<Match> {
  let best: Match = { left: 0, top: 0, width: 0, height: 0, score: -1 };
  for (const w of widths) {
    const h = Math.max(1, Math.round(w / aspect));
    if (w < 6 || h < 6 || w > scene.width || h > scene.height) continue;
    const t = await template(piece, w, h);
    const x0 = Math.max(0, Math.round(cx - w / 2 - radius)), x1 = Math.min(scene.width - w, Math.round(cx - w / 2 + radius));
    const y0 = Math.max(0, Math.round(cy - h / 2 - radius)), y1 = Math.min(scene.height - h, Math.round(cy - h / 2 + radius));
    for (let y = y0; y <= y1; y += step) {
      for (let x = x0; x <= x1; x += step) {
        const score = ncc(scene, t, x, y);
        if (score > best.score) best = { left: x, top: y, width: w, height: h, score };
      }
    }
  }
  return best;
}

/**
 * Finds where an AI model put the jewellery in its generated scene, starting from where we asked it to stay.
 * Coarse search at quarter resolution over ±15% of the canvas and ±25% scale, then a fine search at full resolution.
 * Rotation is not searched: if the AI rotated the piece, the score drops and the shot is retried.
 */
export async function locatePiece(sceneBuf: Buffer, piece: Buffer, expected: Rect, canvas: { width: number; height: number }): Promise<Match> {
  const aspect = expected.width / expected.height;
  const f = 0.25;
  const small = await gray(sceneBuf, Math.round(canvas.width * f), Math.round(canvas.height * f));
  const coarseWidths: number[] = [];
  for (let s = 0.75; s <= 1.2501; s += 0.05) coarseWidths.push(Math.round(expected.width * s * f));
  const coarse = await search(
    small, piece, aspect, coarseWidths,
    (expected.left + expected.width / 2) * f, (expected.top + expected.height / 2) * f,
    Math.round(canvas.width * 0.15 * f), 1,
  );
  if (coarse.score < 0) return { ...expected, score: -1 };

  const full = await gray(sceneBuf, canvas.width, canvas.height);
  const w0 = coarse.width / f;
  const fineWidths = [-0.04, -0.02, 0, 0.02, 0.04].map((d) => Math.round(w0 * (1 + d)));
  return search(full, piece, aspect, fineWidths, (coarse.left + coarse.width / 2) / f, (coarse.top + coarse.height / 2) / f, Math.round(1 / f) + 2, 1);
}
