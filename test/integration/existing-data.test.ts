import { describe, it, expect } from "vitest";
import { db } from "@/infrastructure/db/drizzle/client";
import { DrizzleTournamentRepository } from "@/infrastructure/db/repositories/DrizzleTournamentRepository";
import { state } from "./probe";

/**
 * Level 4 — read-only checks against pre-existing data. Only runs when the
 * database already has rows; skipped entirely on an empty database.
 */
describe.skipIf(!(state.dbOk && state.hasSchema && state.hasExistingData))(
  "Existing data",
  () => {
    const repo = new DrizzleTournamentRepository(db);

    it("has at least one tournament stored", async () => {
      const { rows } = await db.execute(
        `SELECT count(*)::int AS n FROM tournaments`,
      );
      expect(Number(rows[0].n)).toBeGreaterThan(0);
    });

    it("parses a stored tournament aggregate via its share token", async () => {
      const { rows } = await db.execute(
        `SELECT share_token FROM tournaments WHERE share_token IS NOT NULL LIMIT 1`,
      );
      if (rows.length === 0) {
        // No shareable tournament exists; nothing to verify beyond counts.
        return;
      }
      const token = rows[0].share_token;
      const tournament = await repo.findByShareToken(token);
      expect(tournament).not.toBeNull();
      expect(tournament!.getShareToken()).toBe(token);
    });
  },
);