import { Tournament, TournamentId } from "../../../domain/entities/Tournament";
import { TournamentRepository } from "../../ports/TournamentRepository";

export class TournamentNotFoundError extends Error {
  constructor(tournamentId: TournamentId) {
    super(`Tournament ${tournamentId} not found`);
    this.name = "TournamentNotFoundError";
  }
}

export class TournamentNotOwnedError extends Error {
  constructor(tournamentId: TournamentId) {
    super(`You do not have permission to modify tournament ${tournamentId}`);
    this.name = "TournamentNotOwnedError";
  }
}

/**
 * Loads a tournament by id and verifies that `requestingUserId` is its owner.
 * Every use-case that mutates a tournament should go through this instead of
 * calling the repository directly, so the ownership check can never be
 * accidentally skipped.
 */
export async function loadOwnedTournament(
  repository: TournamentRepository,
  tournamentId: TournamentId,
  requestingUserId: string,
): Promise<Tournament> {
  const tournament = await repository.findById(tournamentId);
  if (!tournament) {
    throw new TournamentNotFoundError(tournamentId);
  }
  if (tournament.getOwnerId() !== requestingUserId) {
    throw new TournamentNotOwnedError(tournamentId);
  }
  return tournament;
}
