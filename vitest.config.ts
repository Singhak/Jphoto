import path from "node:path";
import { defineConfig } from "vitest/config";

/**
 * Tests run against a real Postgres (TEST_DATABASE_URL), because what they check is the locks and transactions
 * that keep credits right. tests/global-setup.ts wipes and migrates that database first.
 */
export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname) } },
  test: {
    include: ["tests/**/*.test.ts"],
    globalSetup: ["tests/global-setup.ts"],
    setupFiles: ["tests/env.ts"],
    // One database, so test files run one after another.
    fileParallelism: false,
  },
});
