import { defineConfig, defaultExclude } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    // Integration tests hit the real database and run under their own
    // config (vitest.config.integration.ts); keep them out of the unit run.
    exclude: [...defaultExclude, "test/integration/**"],
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
