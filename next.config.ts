import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Native image and ML packages, and HarfBuzz's WebAssembly, run as plain Node modules, not bundled.
  serverExternalPackages: ["sharp", "@huggingface/transformers", "onnxruntime-node", "harfbuzzjs"],
};

export default nextConfig;
