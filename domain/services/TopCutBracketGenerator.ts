import { Tournament } from "../entities/Tournament";
import { Player } from "../entities/Player";
import { TopCutBracket } from "../entities/TopCutBracket";
import { TiebreakerCalculator } from "./TiebreakerCalculator";

export class TopCutBracketGenerator {
  /**
   * Builds the top cut bracket for a tournament that has just finished its
   * swiss rounds. Seeds the qualifying players by final swiss standings
   * (match points -> OMW% -> OGW% -> DDD, the same order used everywhere
   * else), assigns each qualifier their topCutSeed on the Player entity, and
   * returns the resulting single-elimination bracket.
   */
  static generate(
    tournament: Tournament,
    allPlayersForTiebreakers?: readonly Player[],
  ): TopCutBracket {
    const topCutSize = tournament.getTopCutSize();
    if (topCutSize === null) {
      throw new Error(
        `Tournament ${tournament.getId()} was not configured with a top cut`,
      );
    }

    const activePlayers = tournament.getActivePlayers();
    if (activePlayers.length < topCutSize) {
      throw new Error(
        `Not enough active players (${activePlayers.length}) to fill a top cut of ${topCutSize}`,
      );
    }

    const allPlayers = allPlayersForTiebreakers ?? tournament.getPlayers();
    const tiebreakersById = TiebreakerCalculator.calculateForAll(allPlayers);

    const standings = [...activePlayers].sort((a, b) =>
      TiebreakerCalculator.compare(
        tiebreakersById.get(a.getId())!,
        tiebreakersById.get(b.getId())!,
      ),
    );

    const qualifiers = standings.slice(0, topCutSize);
    qualifiers.forEach((player, index) => player.assignTopCutSeed(index + 1));

    return TopCutBracket.create(qualifiers.map((p) => p.getId()));
  }
}
