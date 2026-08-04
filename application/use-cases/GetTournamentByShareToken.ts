import { Tournament } from "../../domain/entities/Tournament";
import { TournamentRepository } from "../ports/TournamentRepository";

export interface GetTournamentByShareTokenQuery {
  token: string;
}

/**
 * Resolves a tournament from its public share token. Deliberately has no
 * ownership check — anyone with the token is meant to be able to view
 * pairings and standings, that's the entire point of the share link.
 */
export class GetTournamentByShareToken {
  constructor(private readonly tournamentRepository: TournamentRepository) {}

  async execute(query: GetTournamentByShareTokenQuery): Promise<Tournament> {
    const tournament = await this.tournamentRepository.findByShareToken(
      query.token,
    );
    if (!tournament) {
      throw new Error(`No tournament found for share token ${query.token}`);
    }
    return tournament;
  }
}
