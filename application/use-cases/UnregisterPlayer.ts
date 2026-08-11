import { PlayerId } from "../../domain/entities/Player";
import { TournamentId } from "../../domain/entities/Tournament";
import { TournamentRepository } from "../ports/TournamentRepository";
import { Logger } from "../ports/Logger";
import { loadOwnedTournament } from "./shared/loadOwnedTournament";

export interface UnregisterPlayerCommand {
  tournamentId: TournamentId;
  requestingUserId: string;
  playerId: PlayerId;
}

/**
 * Fully removes a player from the tournament (only allowed during
 * registration — Tournament.unregisterPlayer enforces this). Once the
 * tournament has started, use DropPlayer instead: that marks them dropped
 * but keeps their match history intact for everyone else's tiebreakers.
 */
export class UnregisterPlayer {
  constructor(
    private readonly tournamentRepository: TournamentRepository,
    private readonly logger: Logger,
  ) {}

  async execute(command: UnregisterPlayerCommand): Promise<void> {
    const tournament = await loadOwnedTournament(
      this.tournamentRepository,
      command.tournamentId,
      command.requestingUserId,
    );

    tournament.unregisterPlayer(command.playerId);

    await this.tournamentRepository.save(tournament);

    this.logger.info("Player unregistered", {
      tournamentId: tournament.getId(),
      playerId: command.playerId,
    });
  }
}
