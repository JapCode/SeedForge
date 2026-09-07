import { TopCutBracket } from "../../domain/entities/TopCutBracket";
import { TournamentRepository } from "../ports/TournamentRepository";
import { TopCutBracketRepository } from "../ports/TopCutBracketRepository";

export interface GetTopCutBracketByShareTokenQuery {
  token: string;
}

/**
 * Loads the tournament's single-elimination bracket from a public share
 * token. Deliberately has no ownership check — anyone with the token is
 * meant to be able to follow the bracket, same as the standings. Returns
 * null when no bracket has been generated yet (the tournament never
 * advanced to top cut) — the view decides how to surface that.
 */
export class GetTopCutBracketByShareToken {
  constructor(
    private readonly tournamentRepository: TournamentRepository,
    private readonly topCutBracketRepository: TopCutBracketRepository,
  ) {}

  async execute(
    query: GetTopCutBracketByShareTokenQuery,
  ): Promise<TopCutBracket | null> {
    const tournament = await this.tournamentRepository.findByShareToken(
      query.token,
    );
    if (!tournament) {
      throw new Error(`No tournament found for share token ${query.token}`);
    }
    return this.topCutBracketRepository.findByTournamentId(tournament.getId());
  }
}
