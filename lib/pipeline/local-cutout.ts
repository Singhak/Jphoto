import sharp from "sharp";

// BiRefNet (MIT licence, fine for commercial use) running on this machine's CPU. No API key or per-image cost.
// The model (~200 MB) downloads from Hugging Face on first use and is cached in .cache/models.
const MODEL = process.env.LOCAL_CUTOUT_MODEL || "onnx-community/BiRefNet_lite-ONNX";

type Remover = (image: unknown) => Promise<unknown>;
// Kept on globalThis so dev-server hot reloads reuse the loaded model; a module-level variable
// would load another copy on every reload until onnxruntime runs out of memory.
const cache = globalThis as { __jphotoRemover?: Promise<Remover> };

async function load(): Promise<Remover> {
  const { pipeline, env } = await import("@huggingface/transformers");
  env.cacheDir = ".cache/models";
  return (await pipeline("background-removal", MODEL, { dtype: "fp32" })) as unknown as Remover;
}

/** Returns a PNG of the foreground with a transparent background, like fal's removeBackground. */
export async function removeBackgroundLocal(png: Buffer): Promise<Buffer> {
  cache.__jphotoRemover ??= load().catch((err) => {
    cache.__jphotoRemover = undefined;
    throw err;
  });
  const { RawImage } = await import("@huggingface/transformers");
  const { data, info } = await sharp(png).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const input = new RawImage(new Uint8ClampedArray(data), info.width, info.height, 3);
  const result = (await (await cache.__jphotoRemover)(input)) as InstanceType<typeof RawImage> | InstanceType<typeof RawImage>[];
  const out = Array.isArray(result) ? result[0] : result;
  return sharp(Buffer.from(out.data), { raw: { width: out.width, height: out.height, channels: out.channels as 4 } })
    .png()
    .toBuffer();
}
