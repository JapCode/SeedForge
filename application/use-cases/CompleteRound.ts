import { RoundNumber } from "../../domain/entities/Round";
import { TournamentId } from "../../domain/entities/Tournament";
import { TournamentRepository } from "../ports/TournamentRepository";
import { Logger } from "../ports/Logger";
import { loadOwnedTournament } from "./shared/loadOwnedTournament";

export interface CompleteRoundCommand {
  tournamentId: TournamentId;
  requestingUserId: string;
  roundNumber: RoundNumber;
}

/**
 * Marks a round as completed. Tournament.completeRound already enforces that
 * every match in the round has a reported result — this use-case just adds
 * ownership checking, persistence, and logging around that domain call.
 */
export class CompleteRound {
  constructor(
    private readonly tournamentRepository: TournamentRepository,
    private readonly logger: Logger
  ) {}

  async execute(command: CompleteRoundCommand): Promise<void> {
    const tournament = await loadOwnedTournament(
      this.tournamentRepository,
      command.tournamentId,
      command.requestingUserId
    );

    tournament.completeRound(command.roundNumber);

    await this.tournamentRepository.save(tournament);

    this.logger.info("Round completed", {
      tournamentId: tournament.getId(),
      roundNumber: command.roundNumber,
    });
  }
}