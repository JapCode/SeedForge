import { describe, it, expect } from "vitest";
import { Pool } from "pg";

/**
 * Level 1 — pure connectivity. Always runs; if this fails the database is
 * unreachable and nothing else can work.
 */
describe("DB connection", () => {
  it("reaches the database (SELECT 1)", async () => {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      connectionTimeoutMillis: 10_000,
    });
    try {
      const res = await pool.query("SELECT 1 AS ok");
      expect(Number(res.rows[0].ok)).toBe(1);
    } finally {
      await pool.end();
    }
  });
});
