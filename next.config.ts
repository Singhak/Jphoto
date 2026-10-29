import { withSentryConfig } from "@sentry/nextjs/config";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Native image and ML packages, and HarfBuzz's WebAssembly, run as plain Node modules, not bundled.
  serverExternalPackages: ["sharp", "@huggingface/transformers", "onnxruntime-node", "harfbuzzjs"],
};

export default withSentryConfig(nextConfig, {
  // Source maps are uploaded only when SENTRY_AUTH_TOKEN, SENTRY_ORG and SENTRY_PROJECT are set at build time,
  // so stack traces show our code instead of minified bundles. Without them the build still works.
  silent: !process.env.CI,
  // Browser errors go through our own server, so ad-blockers on shop phones don't drop them.
  // Not covered by middleware.ts, which would otherwise send signed-out visitors' errors to /login.
  tunnelRoute: "/monitoring",
});
