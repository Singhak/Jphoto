import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Native image and ML packages run as plain Node modules, not bundled.
  serverExternalPackages: ["sharp", "@huggingface/transformers", "onnxruntime-node"],
};

export default nextConfig;
