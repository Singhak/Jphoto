import { fal } from "@fal-ai/client";
import { recordCall } from "./usage";

let configured = false;

function client() {
  if (!configured) {
    const key = process.env.FAL_KEY;
    if (!key) throw new Error("FAL_KEY is not set. Add it to .env (get one at https://fal.ai/dashboard/keys).");
    fal.config({ credentials: key });
    configured = true;
  }
  return fal;
}

// Model endpoints, kept in one place so they are easy to swap.
export const MODELS = {
  segment: "fal-ai/birefnet/v2",
  fill: "fal-ai/flux-pro/v1/fill",
} as const;

export async function uploadPng(buf: Buffer): Promise<string> {
  return client().storage.upload(new Blob([new Uint8Array(buf)], { type: "image/png" }));
}

export async function download(url: string): Promise<Buffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed (${res.status}): ${url}`);
  return Buffer.from(await res.arrayBuffer());
}

/** Returns a PNG of the jewellery with a transparent background. */
export async function removeBackground(imageUrl: string): Promise<Buffer> {
  recordCall("fal-cutout");
  const { data } = await client().subscribe(MODELS.segment, {
    input: { image_url: imageUrl, model: "General Use (Heavy)", operating_resolution: "2048x2048", output_format: "png", refine_foreground: true },
  });
  const url = (data as { image?: { url: string } }).image?.url;
  if (!url) throw new Error("Segmentation returned no image");
  return download(url);
}

/** Generates new content wherever the mask is white; black areas are kept. */
export async function fill(imageUrl: string, maskUrl: string, prompt: string, megapixels: number, seed?: number): Promise<Buffer> {
  recordCall("fal-fill", megapixels);
  const { data } = await client().subscribe(MODELS.fill, {
    input: { image_url: imageUrl, mask_url: maskUrl, prompt, output_format: "png", safety_tolerance: "2", ...(seed !== undefined && { seed }) },
  });
  const url = (data as { images?: { url: string }[] }).images?.[0]?.url;
  if (!url) throw new Error("Fill returned no image");
  return download(url);
}
