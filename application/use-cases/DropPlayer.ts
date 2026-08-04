import { PlayerId } from "../../domain/entities/Player";
import { TournamentId } from "../../domain/entities/Tournament";
import { TournamentRepository } from "../ports/TournamentRepository";
import { Logger } from "../ports/Logger";
import { loadOwnedTournament } from "./shared/loadOwnedTournament";

export interface DropPlayerCommand {
  tournamentId: TournamentId;
  requestingUserId: string;
  playerId: PlayerId;
}

/**
 * Marks a player as dropped. They stop receiving new pairings (excluded from
 * getActivePlayers), but their past results still count toward everyone
 * else's tiebreakers — dropping never rewrites history.
 */
export class DropPlayer {
  constructor(
    private readonly tournamentRepository: TournamentRepository,
    private readonly logger: Logger,
  ) {}

  async execute(command: DropPlayerCommand): Promise<void> {
    const tournament = await loadOwnedTournament(
      this.tournamentRepository,
      command.tournamentId,
      command.requestingUserId,
    );

    tournament.dropPlayer(command.playerId);

    await this.tournamentRepository.save(tournament);

    this.logger.info("Player dropped", {
      tournamentId: tournament.getId(),
      playerId: command.playerId,
    });
  }
}
