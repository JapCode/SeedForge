import { eq, and, desc } from "drizzle-orm";
import { NodePgDatabase } from "drizzle-orm/node-postgres";
import { Tournament, TournamentId } from "../../../domain/entities/Tournament";
import {
  TournamentRepository,
  TournamentConcurrencyError,
} from "../../../application/ports/TournamentRepository";
import { tournaments } from "../drizzle/schema";
import {
  TournamentMapper,
  SerializedTournament,
} from "../mappers/TournamentMapper";

/**
 * Tracks the row version each Tournament instance was loaded at, keyed by
 * object identity. This keeps optimistic concurrency control entirely an
 * infrastructure concern — neither the Tournament entity nor the
 * TournamentRepository port need to know a "version" exists.
 *
 * A WeakMap is safe here for the lifetime of a single request: the
 * instance loaded via findById is the same instance the use-case later
 * passes to save(), and once that instance is garbage collected the entry
 * disappears with it — no manual cleanup needed.
 */
export class DrizzleTournamentRepository implements TournamentRepository {
  private readonly loadedVersions = new WeakMap<Tournament, number>();

  constructor(private readonly db: NodePgDatabase<Record<string, unknown>>) {}

  async findById(id: TournamentId): Promise<Tournament | null> {
    const rows = await this.db
      .select()
      .from(tournaments)
      .where(eq(tournaments.id, id))
      .limit(1);
    if (rows.length === 0) return null;
    return this.toDomainAndTrackVersion(rows[0]);
  }

  async findByShareToken(token: string): Promise<Tournament | null> {
    const rows = await this.db
      .select()
      .from(tournaments)
      .where(eq(tournaments.shareToken, token))
      .limit(1);
    if (rows.length === 0) return null;
    return this.toDomainAndTrackVersion(rows[0]);
  }

  async findByOwnerId(ownerId: string): Promise<Tournament[]> {
    const rows = await this.db
      .select()
      .from(tournaments)
      .where(eq(tournaments.ownerId, ownerId))
      .orderBy(desc(tournaments.updatedAt));
    return rows.map((row) => this.toDomainAndTrackVersion(row));
  }

  async save(tournament: Tournament): Promise<void> {
    const serialized = TournamentMapper.toSerializable(tournament);
    const knownVersion = this.loadedVersions.get(tournament);

    if (knownVersion === undefined) {
      // Never loaded from this repository: this is a brand-new aggregate
      // (e.g. just built via Tournament.create()), so insert it fresh.
      await this.db.insert(tournaments).values({
        id: serialized.id,
        ownerId: serialized.ownerId,
        shareToken: serialized.shareToken,
        data: serialized,
        version: 1,
        updatedAt: new Date(),
      });
      this.loadedVersions.set(tournament, 1);
      return;
    }

    const updated = await this.db
      .update(tournaments)
      .set({
        ownerId: serialized.ownerId,
        shareToken: serialized.shareToken,
        data: serialized,
        version: knownVersion + 1,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(tournaments.id, serialized.id),
          eq(tournaments.version, knownVersion),
        ),
      )
      .returning({ id: tournaments.id });

    if (updated.length === 0) {
      throw new TournamentConcurrencyError(serialized.id);
    }

    this.loadedVersions.set(tournament, knownVersion + 1);
  }

  private toDomainAndTrackVersion(row: {
    data: unknown;
    version: number;
  }): Tournament {
    const tournament = TournamentMapper.toDomain(
      row.data as SerializedTournament,
    );
    this.loadedVersions.set(tournament, row.version);
    return tournament;
  }
}
