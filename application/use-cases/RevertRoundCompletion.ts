import { RoundNumber } from "../../domain/entities/Round";
import { TournamentId } from "../../domain/entities/Tournament";
import { TournamentRepository } from "../ports/TournamentRepository";
import { Logger } from "../ports/Logger";
import { loadOwnedTournament } from "./shared/loadOwnedTournament";

export interface RevertRoundCompletionCommand {
  tournamentId: TournamentId;
  requestingUserId: string;
  roundNumber: RoundNumber;
}

/**
 * Reverts a round's "completed" status back to pending, without touching
 * any individual match result. Useful when the round was marked done by
 * mistake, or when the organizer wants to reopen it to fix something before
 * reverting the specific match (RevertMatchResult already does this
 * automatically when needed, but this use-case exposes the round-level
 * rollback on its own too, since the organizer may want it directly).
 *
 * Tournament.revertRoundCompletion enforces that only the most recently
 * played round can be reverted, protecting against invalidating a round a
 * later one already depends on.
 */
export class RevertRoundCompletion {
  constructor(
    private readonly tournamentRepository: TournamentRepository,
    private readonly logger: Logger,
  ) {}

  async execute(command: RevertRoundCompletionCommand): Promise<void> {
    const tournament = await loadOwnedTournament(
      this.tournamentRepository,
      command.tournamentId,
      command.requestingUserId,
    );

    tournament.revertRoundCompletion(command.roundNumber);

    await this.tournamentRepository.save(tournament);

    this.logger.info("Round completion reverted", {
      tournamentId: tournament.getId(),
      roundNumber: command.roundNumber,
    });
  }
}
