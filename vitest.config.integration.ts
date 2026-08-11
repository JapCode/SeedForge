import { defineConfig } from "vitest/config";
import path from "path";

/**
 * Integration test config: real database + Better Auth against Neon.
 * Standalone (does not merge the unit config) to keep include/exclude
 * unambiguous. Runs only test/integration/** in a node environment, loads
 * .env, and disables file parallelism so the shared database is not hit
 * concurrently.
 */
export default defineConfig({
  test: {
    include: ["test/integration/**/*.test.ts"],
    environment: "node",
    testTimeout: 60_000,
    hookTimeout: 30_000,
    fileParallelism: false,
    setupFiles: ["./test/loadEnv.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname),
      "@/domain": path.resolve(__dirname, "domain"),
      "@/application": path.resolve(__dirname, "application"),
      "@/infrastructure": path.resolve(__dirname, "infrastructure"),
      "@/components": path.resolve(__dirname, "components"),
    },
  },
});
