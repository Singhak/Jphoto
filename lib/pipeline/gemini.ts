import sharp from "sharp";
import { recordCall } from "./usage";

const API = "https://generativelanguage.googleapis.com/v1beta/models";

// Flash image is the cheap default; set GEMINI_IMAGE_MODEL=gemini-3-pro-image if quality needs it.
// Model names change often; set them in .env and check https://ai.google.dev/gemini-api/docs/models
export function geminiModels() {
  return {
    image: process.env.GEMINI_IMAGE_MODEL || "gemini-3.1-flash-image",
    judge: process.env.GEMINI_JUDGE_MODEL || "gemini-3.8-flash",
  };
}

export function hasGeminiKey() {
  return Boolean(process.env.GEMINI_API_KEY);
}

type Part = { text: string } | { inline_data: { mime_type: string; data: string } };

interface GenerateResponse {
  candidates?: { content?: { parts?: { text?: string; inlineData?: { mimeType: string; data: string } }[] }; finishReason?: string }[];
  promptFeedback?: { blockReason?: string };
}

async function generate(model: string, parts: Part[], generationConfig: Record<string, unknown>): Promise<GenerateResponse> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY is not set. Add it to .env (get one at https://aistudio.google.com/apikey).");
  const body = JSON.stringify({ contents: [{ role: "user", parts }], generationConfig });
  let res: Response | undefined;
  let networkError: unknown;
  // Busy (503), rate-limited (429), transient 500s and dropped connections are common; back off and retry.
  for (const wait of [0, 3000, 8000, 20000]) {
    if (wait) await new Promise((r) => setTimeout(r, wait));
    try {
      res = await fetch(`${API}/${model}:generateContent`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-goog-api-key": key },
        body,
        signal: AbortSignal.timeout(180_000),
      });
      networkError = undefined;
    } catch (err) {
      networkError = err;
      continue;
    }
    if (![429, 500, 503].includes(res.status)) break;
  }
  if (!res || networkError) {
    const cause = (networkError as { cause?: { message?: string } })?.cause?.message ?? (networkError as Error)?.message;
    throw new Error(`Could not reach Gemini (${model}): ${cause}`);
  }
  if (!res.ok) throw new Error(`Gemini ${model} failed (${res.status}): ${(await res.text()).slice(0, 400)}`);
  const json = (await res.json()) as GenerateResponse;
  if (json.promptFeedback?.blockReason) throw new Error(`Gemini blocked the request: ${json.promptFeedback.blockReason}`);
  return json;
}

const png = (buf: Buffer): Part => ({ inline_data: { mime_type: "image/png", data: buf.toString("base64") } });

/** Checks only need to see the piece, not every pixel; smaller images cost fewer input tokens. */
async function small(buf: Buffer, max = 768): Promise<Part> {
  return png(await sharp(buf).resize(max, max, { fit: "inside", withoutEnlargement: true }).png().toBuffer());
}

/** Generates a scene from the jewellery image and a text instruction. Gemini redraws the whole image, so the result must be re-aligned and composited. */
export async function geminiScene(image: Buffer, prompt: string, aspectRatio = "4:5"): Promise<Buffer> {
  recordCall("gemini-image");
  const json = await generate(geminiModels().image, [{ text: prompt }, png(image)], {
    responseModalities: ["TEXT", "IMAGE"],
    imageConfig: { aspectRatio },
  });
  const parts = json.candidates?.[0]?.content?.parts ?? [];
  const img = parts.find((p) => p.inlineData?.data);
  if (!img?.inlineData) {
    const text = parts.map((p) => p.text).filter(Boolean).join(" ");
    throw new Error(`Gemini returned no image (${json.candidates?.[0]?.finishReason ?? "unknown"}) ${text.slice(0, 200)}`);
  }
  return Buffer.from(img.inlineData.data, "base64");
}

export interface JudgeResult {
  ok: boolean;
  /** 1–10 overall catalog quality. */
  score: number;
  issues: string[];
}

/** Minimum judge score for an image to be shown to the jeweller. */
export const MIN_JUDGE_SCORE = 7;

/** A vision model reviews the finished shot the way a fussy jeweller would, before the customer sees it. */
export async function judgeShot(cutout: Buffer, result: Buffer, piece: string): Promise<JudgeResult> {
  const prompt = `You are quality-checking an AI-generated jewellery catalog photo for an Indian jeweller.
Image 1 is the jeweller's actual ${piece}. Image 2 is the generated catalog photo that should show exactly this ${piece}.
Be strict. Report any of these problems:
- the ${piece} in image 2 differs from image 1 (shape, stones, colours, missing or extra parts)
- a second or duplicate copy of the jewellery, or leftover ghost edges around it
- it is worn or placed implausibly (floating, wrong body part, wrong scale for a real person, wrong perspective)
- anatomy errors (hands, fingers, ears, face, neck)
- lighting on the jewellery clearly mismatches the scene
- visible artefacts, text, watermarks, or anything a jeweller would not publish
- any person shown is not dressed and presented modestly and appropriately for a family jewellery catalog (always required, especially for children)
Score 1-10 for whether a jeweller would publish it as-is in their catalog.`;
  recordCall("gemini-check");
  const json = await generate(geminiModels().judge, [{ text: prompt }, await small(cutout), await small(result)], {
    responseMimeType: "application/json",
    responseSchema: {
      type: "OBJECT",
      properties: { score: { type: "INTEGER" }, issues: { type: "ARRAY", items: { type: "STRING" } } },
      required: ["score", "issues"],
    },
  });
  const text = json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
  const parsed = JSON.parse(text) as { score: number; issues: string[] };
  return { ok: parsed.score >= MIN_JUDGE_SCORE, score: parsed.score, issues: parsed.issues };
}

/**
 * Cheap text-model check on the cutout: is anything other than jewellery left in it (finger, pen, stand)?
 * Runs before the costly image clean-up, which is only used when this finds something.
 */
export async function findProps(cutout: Buffer, piece: string): Promise<string[]> {
  const prompt = `This is a background-removed photo that should contain only a ${piece} (jewellery).
List every object in it that is NOT part of the jewellery, such as fingers, hands, pens, sticks, stands, putty, tags, boxes or cloth.
Return an empty list if it is only jewellery.`;
  recordCall("gemini-check");
  const json = await generate(geminiModels().judge, [{ text: prompt }, await small(cutout, 512)], {
    responseMimeType: "application/json",
    responseSchema: { type: "OBJECT", properties: { objects: { type: "ARRAY", items: { type: "STRING" } } }, required: ["objects"] },
  });
  const text = json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
  return (JSON.parse(text) as { objects: string[] }).objects;
}
