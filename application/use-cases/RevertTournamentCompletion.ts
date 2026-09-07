import { TournamentId } from "../../domain/entities/Tournament";
import { TournamentRepository } from "../ports/TournamentRepository";
import { Logger } from "../ports/Logger";
import { loadOwnedTournament } from "./shared/loadOwnedTournament";

export interface RevertTournamentCompletionCommand {
  tournamentId: TournamentId;
  requestingUserId: string;
}

/**
 * Reverts a completed tournament back to the swiss phase (or to top_cut when
 * a top cut is configured), so the organizer can reopen results or re-run the
 * final. The inverse of CompleteTournament.
 */
export class RevertTournamentCompletion {
  constructor(
    private readonly tournamentRepository: TournamentRepository,
    private readonly logger: Logger,
  ) {}

  async execute(command: RevertTournamentCompletionCommand): Promise<void> {
    const tournament = await loadOwnedTournament(
      this.tournamentRepository,
      command.tournamentId,
      command.requestingUserId,
    );

    tournament.revertCompletion();

    await this.tournamentRepository.save(tournament);

    this.logger.info("Tournament completion reverted", {
      tournamentId: tournament.getId(),
    });
  }
}
