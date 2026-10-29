import sharp from "sharp";
import { locatePiece, MIN_ALIGN_SCORE } from "./align";
import { fill, removeBackground, uploadPng } from "./fal";
import { type Completion, completeCutout } from "./complete";
import { checkFidelity, type FidelityResult } from "./fidelity";
import { findProps, geminiScene, hasGeminiKey, judgeShot, type JudgeResult } from "./gemini";
import { removeBackgroundLocal } from "./local-cutout";
import {
  compositeFinal,
  fillInputs,
  hasTransparentBackground,
  inputQuality,
  type InputQuality,
  maskReport,
  type MaskReport,
  placeAt,
  placeOnCanvas,
  prepareInput,
  solidBackground,
  trimToContent,
} from "./images";
import { assertStyleFits, getStyle, type PieceType, placementFor } from "./presets";
import { type SetSplit, splitSet } from "./set-split";

export * from "./presets";
export { checkFidelity, MIN_PSNR } from "./fidelity";
export { MIN_JUDGE_SCORE } from "./gemini";
export { MIN_ALIGN_SCORE } from "./align";
export { sideBySide } from "./images";
export { extractPart, type SetSplit, splitSet } from "./set-split";
export { usageSummary } from "./usage";

/** 4:5 portrait, the Instagram feed and marketplace-friendly ratio. Multiples of 32 suit the fill model. */
export const CANVAS = { width: 1024, height: 1280 };
/**
 * AI backgrounds are generated at this smaller 4:5 size and enlarged to CANVAS. fal bills per started
 * megapixel, so 0.93 MP costs half of 1.31 MP. The jewellery is pasted in afterwards at full CANVAS
 * resolution, so only the background is enlarged and the piece stays sharp.
 */
const GEN = { width: 864, height: 1080 };

/** Uploads below this are rejected before any paid call; they cannot produce a sharp catalog image. */
const MIN_SHORT_SIDE = 600;
/** Laplacian variance below this suggests a blurry photo. Starting guess: tune it on the validation photos. */
const MIN_SHARPNESS = 60;
/**
 * Share of the piece that is pure white before we warn about glare. Diamonds and polished metal always
 * have small sparkles, so only large blown-out patches count. Starting guess: tune it on the validation photos.
 */
const MAX_GLARE = 0.08;

export interface Cutout {
  /** Trimmed RGBA PNG of just the jewellery. */
  png: Buffer;
  mask: MaskReport;
  quality: InputQuality;
  /** Problems that should stop generation; show them to the jeweller with tips to retake the photo. */
  problems: string[];
  /** Things a human should look at, but that do not block generation. */
  warnings: string[];
  /** Plain cutout before the Gemini completion step (same as png when completion was skipped). */
  rawPng: Buffer;
  completion?: Omit<Completion, "png">;
  /** Necklace sets only: where the necklace and each earring are, for placing them on a model. */
  set?: SetSplit;
}

export interface ExtractOptions {
  /**
   * Check the cutout for props (cheap) and, only if any are found, ask Gemini to remove them and redraw
   * hidden parts (one image generation). Defaults to on when GEMINI_API_KEY is set.
   */
  complete?: boolean;
  piece?: PieceType;
}

/**
 * Step 1: isolate the jewellery and check the photo. Do this once per photo and reuse it for every style.
 * Background removal keeps everything in the foreground, so the piece must be photographed on its own
 * (on a plain surface or stand), not worn.
 */
export async function extractJewellery(photo: Buffer, opts: ExtractOptions = {}): Promise<Cutout> {
  const cutout = await extractCutout(photo, opts);
  if (opts.piece === "necklace-set" && cutout.problems.length === 0) cutout.set = await splitSet(cutout.png);
  return cutout;
}

async function extractCutout(photo: Buffer, opts: ExtractOptions): Promise<Cutout> {
  const prepared = await prepareInput(photo);
  const raw = (await hasTransparentBackground(prepared)) ? prepared : await cutoutEngine(prepared);
  const [mask, quality] = await Promise.all([maskReport(raw), inputQuality(prepared, raw)]);
  const problems: string[] = [];
  const warnings: string[] = [];
  if (quality.shortSide < MIN_SHORT_SIDE) problems.push(`Photo is too small (${quality.shortSide}px). Use the phone's main camera at full resolution.`);
  if (mask.coverage < 0.005) problems.push("Could not find the jewellery. Fill more of the frame with the piece.");
  if (quality.touchesEdge) problems.push("Part of the piece is cut off at the edge of the photo. Leave some space around it.");
  if (quality.sharpness < MIN_SHARPNESS) warnings.push(`Photo may be blurry (sharpness ${quality.sharpness.toFixed(0)}). Hold the phone steady and tap to focus on the piece.`);
  if (quality.glare > MAX_GLARE) warnings.push(`Strong glare on the piece (${Math.round(quality.glare * 100)}% is pure white). The glare will show in every photo, so move away from direct light or turn off the flash, and retake.`);
  if (mask.softEdgeRatio > 0.35) warnings.push("Cutout edges are very soft; thin chains or stones may be partly lost.");
  const rawPng = await trimToContent(raw);
  if (!(opts.complete ?? hasGeminiKey())) return { png: rawPng, rawPng, mask, quality, problems, warnings };

  const pieceName = (opts.piece ?? "jewellery").replace("-", " ");
  const reason = (err: unknown) => (err as Error).message.split("\n")[0].slice(0, 160);
  let props: string[];
  try {
    props = await findProps(rawPng, pieceName);
  } catch (err) {
    // Our outage or quota, not the jeweller's photo: carry on with the plain cutout.
    warnings.push(`Prop check skipped: ${reason(err)}`);
    return { png: rawPng, rawPng, mask, quality, problems, warnings };
  }
  if (props.length === 0) return { png: rawPng, rawPng, mask, quality, problems, warnings };
  let result: Completion;
  try {
    result = await completeCutout(rawPng, pieceName, cutoutEngine);
  } catch (err) {
    // A prop is in the cutout and could not be removed; never publish it. No credit has been used yet.
    problems.push(`Found ${props.join(", ")} with the piece and could not remove it (${reason(err)}). Photograph the piece on its own.`);
    return { png: rawPng, rawPng, mask, quality, problems, warnings };
  }
  warnings.push(`Removed from the photo: ${props.join(", ")}.`);
  const { png: completed, ...completion } = result;
  if (!completion.ok) {
    problems.push(`Something is covering the piece or it could not be cleaned up (${completion.reasons.join("; ")}). Photograph it on its own with nothing touching it.`);
    return { png: rawPng, rawPng, mask, quality, problems, warnings, completion };
  }
  if (completion.reconstructed > 0.01) {
    warnings.push(`${(completion.reconstructed * 100).toFixed(1)}% of the piece was redrawn by AI where it was hidden; check those parts.`);
  }
  return { png: completed, rawPng, mask, quality, problems, warnings, completion };
}

/**
 * fal's hosted BiRefNet when FAL_KEY is set, falling back to the free local model if fal fails (no balance,
 * outage), so the jeweller never sees the error. CUTOUT_ENGINE=local|fal forces one engine with no fallback.
 */
async function cutoutEngine(prepared: Buffer): Promise<Buffer> {
  const forced = process.env.CUTOUT_ENGINE;
  if (forced === "local" || (!forced && !process.env.FAL_KEY)) return removeBackgroundLocal(prepared);
  try {
    return await removeBackground(await uploadPng(prepared));
  } catch (err) {
    if (forced === "fal") throw err;
    console.warn(`fal cutout failed, using the local model instead: ${(err as Error).message.split("\n")[0]}`);
    return removeBackgroundLocal(prepared);
  }
}

export type Engine = "local" | "fill" | "gemini";

export interface ShotResult {
  styleId: string;
  engine: Engine;
  png: Buffer;
  /** True only if every check passed. Only accepted shots are shown to the jeweller or cost a credit. */
  accepted: boolean;
  rejectReasons: string[];
  fidelity: FidelityResult;
  /** Gemini only: how well the original piece lined up with where the AI put it. */
  alignScore?: number;
  judge?: JudgeResult;
  attempts: number;
}

export interface RenderOptions {
  /** Override the style's default engine for AI styles. */
  engine?: "fill" | "gemini";
  maxAttempts?: number;
  seed?: number;
  /** Run the vision-model quality judge on AI shots. Defaults to on when GEMINI_API_KEY is set. */
  judge?: boolean;
}

/** Step 2: place the cutout in a scene, then run the fidelity, alignment and judge checks. Retries until a shot passes. */
export async function renderShot(cutout: Cutout, piece: PieceType, styleId: string, opts: RenderOptions = {}): Promise<ShotResult> {
  const style = getStyle(styleId);
  assertStyleFits(piece, style);
  // Product scenes prefer the masked fill (fal), which never moves the piece; without a fal key they fall back to Gemini.
  const preferred = style.kind === "model" || !process.env.FAL_KEY ? "gemini" : "fill";
  const engine: Engine = style.local ? "local" : (opts.engine ?? preferred);
  const { width, height } = CANVAS;
  const placement = placementFor(piece, style.kind);
  const target = await placeOnCanvas(cutout.png, width, height, placement);
  const genTarget = engine === "local" ? target : await placeOnCanvas(cutout.png, GEN.width, GEN.height, placement);
  const maxAttempts = opts.maxAttempts ?? (engine === "local" ? 1 : 3);
  const useJudge = engine !== "local" && (opts.judge ?? hasGeminiKey());
  const pieceName = piece.replace("-", " ");

  let last: ShotResult | undefined;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const rejectReasons: string[] = [];
    let placed = target;
    let background: Buffer;
    let alignScore: number | undefined;

    if (engine === "local") {
      background = await solidBackground(width, height, style.local!.background);
    } else if (engine === "fill") {
      const { image, mask } = await fillInputs(genTarget);
      const [imageUrl, maskUrl] = await Promise.all([uploadPng(image), uploadPng(mask)]);
      const prompt = [style.prompt, placement.poseHint, `the ${pieceName} is already in the image, keep it exactly as is`].filter(Boolean).join(", ");
      const generated = await fill(imageUrl, maskUrl, prompt, (GEN.width * GEN.height) / 1e6, opts.seed !== undefined ? opts.seed + attempt - 1 : undefined);
      background = await sharp(generated).resize(width, height, { fit: "fill", kernel: "lanczos3" }).png().toBuffer();
    } else {
      const { image } = await fillInputs(genTarget);
      const prompt = [
        `Create a ${style.kind === "model" ? "photograph" : "product photograph"}: ${style.prompt}.`,
        placement.poseHint && `${placement.poseHint}.`,
        `Use the exact ${pieceName} shown in this image. Do not change its design, stones, colour or proportions.`,
        `Keep the ${pieceName} at the same position and size in the frame. Replace only the grey background.`,
        piece === "necklace-set" ? "Show exactly this set: the necklace and its pair of earrings, nothing else. Photorealistic, no text." : "Show exactly one piece of jewellery. Photorealistic, no text.",
      ].filter(Boolean).join(" ");
      const scene = await geminiScene(image, prompt);
      background = await sharp(scene).resize(width, height, { fit: "cover" }).png().toBuffer();
      // Gemini redraws the whole image, so find where it put the piece and paste the original back there.
      const match = await locatePiece(background, cutout.png, target.rect, CANVAS);
      alignScore = match.score;
      if (match.score < MIN_ALIGN_SCORE) rejectReasons.push(`AI moved or reshaped the piece (alignment ${match.score.toFixed(2)})`);
      else placed = await placeAt(cutout.png, width, height, match);
    }

    const png = await compositeFinal(background, placed, engine === "local");
    const fidelity = await checkFidelity(placed.layer, png);
    if (!fidelity.passed) rejectReasons.push(`Jewellery pixels changed (PSNR ${fidelity.psnr.toFixed(1)} dB)`);

    let judge: JudgeResult | undefined;
    if (useJudge && rejectReasons.length === 0) {
      judge = await judgeShot(cutout.png, png, pieceName);
      if (!judge.ok) rejectReasons.push(`Quality judge ${judge.score}/10: ${judge.issues.join("; ")}`);
    }

    last = { styleId, engine, png, accepted: rejectReasons.length === 0, rejectReasons, fidelity, alignScore, judge, attempts: attempt };
    if (last.accepted) return last;
  }
  return last!;
}

