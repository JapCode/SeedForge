import { TopCutBracket } from "../../domain/entities/TopCutBracket";
import { TournamentId } from "../../domain/entities/Tournament";
import { TournamentRepository } from "../ports/TournamentRepository";
import { TopCutBracketRepository } from "../ports/TopCutBracketRepository";
import { loadOwnedTournament } from "./shared/loadOwnedTournament";

export interface GetTopCutBracketCommand {
  tournamentId: TournamentId;
  requestingUserId: string;
}

/**
 * Loads the tournament's single-elimination bracket for the operator view.
 * Goes through loadOwnedTournament so the ownership check can never be
 * skipped. Returns null when no bracket has been generated yet (the
 * tournament never advanced to top cut) — the view decides how to surface
 * that instead of throwing.
 */
export class GetTopCutBracket {
  constructor(
    private readonly tournamentRepository: TournamentRepository,
    private readonly topCutBracketRepository: TopCutBracketRepository,
  ) {}

  async execute(
    command: GetTopCutBracketCommand,
  ): Promise<TopCutBracket | null> {
    const tournament = await loadOwnedTournament(
      this.tournamentRepository,
      command.tournamentId,
      command.requestingUserId,
    );
    return this.topCutBracketRepository.findByTournamentId(tournament.getId());
  }
}
