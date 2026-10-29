import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

/**
 * Where image files live. Two drivers, picked by STORAGE_DRIVER:
 *  - "local" (default): files under .cache/storage on this machine. Fine for dev and a single self-hosted server.
 *  - "s3": any S3-compatible bucket: Supabase Storage, Cloudflare R2, AWS S3, or self-hosted MinIO.
 * The bucket must be private: files are only ever served through our API routes, which check who owns them.
 */
interface Storage {
  put(key: string, body: Buffer, contentType: string): Promise<void>;
  /** Throws if the file does not exist. */
  get(key: string): Promise<Buffer>;
}

function local(): Storage {
  const root = path.join(process.cwd(), ".cache", "storage");
  const at = (key: string) => path.join(root, ...key.split("/"));
  return {
    async put(key, body) {
      await mkdir(path.dirname(at(key)), { recursive: true });
      await writeFile(at(key), body);
    },
    get: (key) => readFile(at(key)),
  };
}

function s3(): Storage {
  const bucket = process.env.S3_BUCKET;
  if (!bucket) throw new Error("S3_BUCKET is not set. See .env.example.");
  const client = new S3Client({
    endpoint: process.env.S3_ENDPOINT || undefined,
    region: process.env.S3_REGION || "auto",
    // Supabase Storage and MinIO need path-style URLs; AWS and R2 accept them too.
    forcePathStyle: true,
    credentials: { accessKeyId: process.env.S3_ACCESS_KEY_ID!, secretAccessKey: process.env.S3_SECRET_ACCESS_KEY! },
  });
  return {
    async put(key, body, contentType) {
      await client.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: contentType }));
    },
    async get(key) {
      const res = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
      return Buffer.from(await res.Body!.transformToByteArray());
    },
  };
}

const driver = process.env.STORAGE_DRIVER ?? "local";
if (driver !== "local" && driver !== "s3") throw new Error(`Unknown STORAGE_DRIVER "${driver}". Use "local" or "s3".`);
export const storage: Storage = driver === "s3" ? s3() : local();
