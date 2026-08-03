import { Player } from "../../domain/entities/Player";
import { TournamentId } from "../../domain/entities/Tournament";
import { TournamentRepository } from "../ports/TournamentRepository";
import { IdGenerator } from "../ports/IdGenerator";
import { Logger } from "../ports/Logger";
import { loadOwnedTournament } from "./shared/loadOwnedTournament";

export interface RegisterPlayerCommand {
  tournamentId: TournamentId;
  requestingUserId: string;
  playerName: string;
}

export class RegisterPlayer {
  constructor(
    private readonly tournamentRepository: TournamentRepository,
    private readonly idGenerator: IdGenerator,
    private readonly logger: Logger,
  ) {}

  async execute(command: RegisterPlayerCommand): Promise<Player> {
    const tournament = await loadOwnedTournament(
      this.tournamentRepository,
      command.tournamentId,
      command.requestingUserId,
    );

    const player = Player.create(
      this.idGenerator.generate(),
      command.playerName,
    );
    tournament.registerPlayer(player);

    await this.tournamentRepository.save(tournament);

    this.logger.info("Player registered", {
      tournamentId: tournament.getId(),
      playerId: player.getId(),
      playerName: player.getName(),
    });

    return player;
  }
}
