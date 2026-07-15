import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
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
