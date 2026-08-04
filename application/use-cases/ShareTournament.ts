import { TournamentId } from "../../domain/entities/Tournament";
import { TournamentRepository } from "../ports/TournamentRepository";
import { IdGenerator } from "../ports/IdGenerator";
import { Logger } from "../ports/Logger";
import { loadOwnedTournament } from "./shared/loadOwnedTournament";

export interface ShareTournamentCommand {
  tournamentId: TournamentId;
  requestingUserId: string;
}

/**
 * Generates the public read-only share token for a tournament's pairings
 * and standings. Idempotent: calling it again on a tournament that already
 * has a token just returns the existing one, instead of invalidating
 * whatever link was already shared out.
 */
export class ShareTournament {
  constructor(
    private readonly tournamentRepository: TournamentRepository,
    private readonly idGenerator: IdGenerator,
    private readonly logger: Logger,
  ) {}

  async execute(command: ShareTournamentCommand): Promise<string> {
    const tournament = await loadOwnedTournament(
      this.tournamentRepository,
      command.tournamentId,
      command.requestingUserId,
    );

    const existingToken = tournament.getShareToken();
    if (existingToken) {
      return existingToken;
    }

    const token = this.idGenerator.generate();
    tournament.setShareToken(token);

    await this.tournamentRepository.save(tournament);

    this.logger.info("Tournament share link created", {
      tournamentId: tournament.getId(),
    });

    return token;
  }
}
