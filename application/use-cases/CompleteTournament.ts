import { TournamentId } from "../../domain/entities/Tournament";
import { TournamentRepository } from "../ports/TournamentRepository";
import { Logger } from "../ports/Logger";
import { loadOwnedTournament } from "./shared/loadOwnedTournament";

export interface CompleteTournamentCommand {
  tournamentId: TournamentId;
  requestingUserId: string;
}

/**
 * Marks a tournament as completed once all swiss rounds are done. Only
 * meaningful for tournaments with no top cut configured — a tournament with
 * a top cut instead completes automatically when ReportBracketMatchWinner
 * decides the final (Tournament.complete() itself rejects trying to finish
 * a top-cut tournament directly from the swiss phase).
 */
export class CompleteTournament {
  constructor(
    private readonly tournamentRepository: TournamentRepository,
    private readonly logger: Logger,
  ) {}

  async execute(command: CompleteTournamentCommand): Promise<void> {
    const tournament = await loadOwnedTournament(
      this.tournamentRepository,
      command.tournamentId,
      command.requestingUserId,
    );

    tournament.complete();

    await this.tournamentRepository.save(tournament);

    this.logger.info("Tournament completed", {
      tournamentId: tournament.getId(),
    });
  }
}
