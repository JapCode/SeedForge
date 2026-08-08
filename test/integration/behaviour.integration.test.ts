import { describe, it, expect, beforeAll, afterEach } from "vitest";
import { eq, sql } from "drizzle-orm";
import { auth } from "@/infrastructure/auth/auth";
import { db } from "@/infrastructure/db/drizzle/client";
import { tournaments } from "@/infrastructure/db/drizzle/schema";
import { DrizzleTournamentRepository } from "@/infrastructure/db/repositories/DrizzleTournamentRepository";
import { TournamentConcurrencyError } from "@/application/ports/TournamentRepository";
import { Tournament } from "@/domain/entities/Tournament";
import { state } from "./probe";

/**
 * Level 3 — data layer behaviour (Better Auth + Drizzle repositories).
 * Gated by connectivity + schema. Self-sufficient: every test creates its
 * own unique fixtures and cleans them up, so it behaves identically whether
 * the database already has data or not.
 */
describe.skipIf(!(state.dbOk && state.hasSchema))("Data layer", () => {
  const repo = new DrizzleTournamentRepository(db);
  const createdUserIds: string[] = [];

  afterEach(async () => {
    // user has onDelete: cascade -> removes tournaments/account/session.
    for (const id of createdUserIds) {
      await db.delete(tournaments).where(eq(tournaments.ownerId, id));
    }
    for (const id of createdUserIds) {
      await db.execute(sql`DELETE FROM "user" WHERE id = ${id}`);
    }
    createdUserIds.length = 0;
  });

  async function createUser(): Promise<{ id: string; token: string }> {
    const email = `integration+${Date.now()}+${Math.random()
      .toString(36)
      .slice(2, 8)}@test.local`;
    const res = await auth.api.signUpEmail({
      body: { name: "Integration Tester", email, password: "TestPass123!" },
    });
    if (!res.user) throw new Error("signUpEmail returned no user");
    createdUserIds.push(res.user.id);
    return { id: res.user.id, token: res.token ?? "" };
  }

  describe("Better Auth", () => {
    it("signs up a user and persists user/account/session rows", async () => {
      const { id } = await createUser();
      const userRows = await db
        .select({ id: tournaments.id })
        .from(tournaments)
        .where(eq(tournaments.ownerId, id));
      // The user row itself must exist (FK target).
      const { rows } = await db.execute(
        sql`SELECT count(*)::int AS n FROM "user" WHERE id = ${id}`,
      );
      expect(Number(rows[0].n)).toBe(1);
      expect(userRows).toBeDefined();
    });

    it("resolves the session from the returned token", async () => {
      const { token } = await createUser();
      expect(token).toBeTruthy();
      const session = await auth.api.getSession({
        headers: new Headers({ Authorization: `Bearer ${token}` }),
      });
      expect(session).not.toBeNull();
      expect(session?.user.email).toMatch(/@test\.local$/);
    });
  });

  describe("DrizzleTournamentRepository", () => {
    it("saves and reads back a tournament (round-trip)", async () => {
      const { id: ownerId } = await createUser();
      const tournament = Tournament.create({
        id: `t-${Date.now()}`,
        ownerId,
        name: "Integration Cup",
        totalSwissRounds: 3,
      });
      tournament.setShareToken(`share-${Date.now()}`);

      await repo.save(tournament);
      const found = await repo.findById(tournament.getId());

      expect(found).not.toBeNull();
      expect(found!.getName()).toBe("Integration Cup");
      expect(found!.getOwnerId()).toBe(ownerId);
      expect(found!.getShareToken()).toBe(tournament.getShareToken());
    });

    it("finds a tournament by share token", async () => {
      const { id: ownerId } = await createUser();
      const tournament = Tournament.create({
        id: `t-${Date.now()}`,
        ownerId,
        name: "Shared Cup",
        totalSwissRounds: 1,
      });
      tournament.setShareToken(`share-${Date.now()}`);

      await repo.save(tournament);
      const found = await repo.findByShareToken(tournament.getShareToken()!);

      expect(found).not.toBeNull();
      expect(found!.getId()).toBe(tournament.getId());
    });

    it("throws TournamentConcurrencyError when the row version changed", async () => {
      const { id: ownerId } = await createUser();
      const tournament = Tournament.create({
        id: `t-${Date.now()}`,
        ownerId,
        name: "Concurrency Cup",
        totalSwissRounds: 1,
      });

      await repo.save(tournament); // version = 1
      const loaded = await repo.findById(tournament.getId());
      expect(loaded).not.toBeNull();

      // Simulate a concurrent writer bumping the version.
      await db
        .update(tournaments)
        .set({ version: 2 })
        .where(eq(tournaments.id, tournament.getId()));

      await expect(repo.save(loaded!)).rejects.toBeInstanceOf(
        TournamentConcurrencyError,
      );
    });
  });
});