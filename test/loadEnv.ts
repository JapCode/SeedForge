/**
 * Loads the project .env into process.env for tests that need real
 * credentials (DATABASE_URL, BETTER_AUTH_SECRET, ...). Vitest does not
 * populate process.env from .env by default; the pg Pool and Better Auth
 * read process.env directly.
 *
 * Used as a setupFiles entry in the integration config so it runs before
 * any test module (and its imports) executes.
 */
try {
  process.loadEnvFile(".env");
} catch {
  // .env missing: fall back to whatever the shell already exported.
}