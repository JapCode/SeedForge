import { Tournament, TournamentId } from "../../domain/entities/Tournament";

/**
 * Thrown by save() when the tournament was modified by someone else since
 * it was loaded (optimistic concurrency conflict). Callers should reload
 * the tournament and retry the operation, or surface a "someone else just
 * updated this, please retry" message to the user.
 */
export class TournamentConcurrencyError extends Error {
  constructor(tournamentId: TournamentId) {
    super(
      `Tournament ${tournamentId} was modified concurrently by someone else. Reload and try again.`,
    );
    this.name = "TournamentConcurrencyError";
  }
}

/**
 * Optional slice for paginated queries. `offset` is 0-based and applied in
 * the repository's stable order (most recently updated first).
 */
export interface Pagination {
  limit: number;
  offset: number;
}

export interface TournamentRepository {
  findById(id: TournamentId): Promise<Tournament | null>;
  findByShareToken(token: string): Promise<Tournament | null>;
  findByOwnerId(
    ownerId: string,
    pagination?: Pagination,
  ): Promise<Tournament[]>;
  countByOwnerId(ownerId: string): Promise<number>;
  save(tournament: Tournament): Promise<void>;
}
