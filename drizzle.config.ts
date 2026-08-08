import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./infrastructure/db/drizzle/schema.ts",
  out: "./infrastructure/db/drizzle/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
