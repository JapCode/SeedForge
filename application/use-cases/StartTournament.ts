import { TournamentId } from "../../domain/entities/Tournament";
import { TournamentRepository } from "../ports/TournamentRepository";
import { Logger } from "../ports/Logger";
import { loadOwnedTournament } from "./shared/loadOwnedTournament";

export interface StartTournamentCommand {
  tournamentId: TournamentId;
  requestingUserId: string;
}

export class StartTournament {
  constructor(
    private readonly tournamentRepository: TournamentRepository,
    private readonly logger: Logger,
  ) {}

  async execute(command: StartTournamentCommand): Promise<void> {
    const tournament = await loadOwnedTournament(
      this.tournamentRepository,
      command.tournamentId,
      command.requestingUserId,
    );

    tournament.startSwissRounds();

    await this.tournamentRepository.save(tournament);

    this.logger.info("Tournament started", {
      tournamentId: tournament.getId(),
      playerCount: tournament.getPlayers().length,
    });
  }
}
