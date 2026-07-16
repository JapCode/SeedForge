import { Player, PlayerId } from "../entities/Player";

/**
 * Official Swiss tiebreaker rule (used by KTS and virtually every other
 * Swiss-pairing TCG tournament software): no opponent's win percentage can
 * ever count as less than 33% when averaging it into OMW%/OGW%. This keeps
 * a player from being punished in tiebreakers just because they happened to
 * beat someone who went 0-fer the whole tournament.
 */
const MINIMUM_OPPONENT_PERCENTAGE = 1 / 3;

export interface Tiebreakers {
  matchPoints: number;
  matchWinPercentage: number;
  opponentsMatchWinPercentage: number;
  gameWinPercentage: number;
  opponentsGameWinPercentage: number;
}

export class TiebreakerCalculator {
  /**
   * Computes the full tiebreaker set for a single player. `allPlayers` must
   * include every player the tournament has ever had (including dropped
   * players), since a player's past opponents may have since dropped but
   * still count toward OMW%/OGW%.
   */
  static calculateFor(
    player: Player,
    allPlayers: readonly Player[],
  ): Tiebreakers {
    const playerById = new Map(allPlayers.map((p) => [p.getId(), p]));

    const opponents = player.getOpponentIds().map((opponentId) => {
      const opponent = playerById.get(opponentId);
      if (!opponent) {
        throw new Error(
          `Opponent ${opponentId} referenced by player ${player.getId()} was not found`,
        );
      }
      return opponent;
    });

    return {
      matchPoints: player.getPoints(),
      matchWinPercentage: this.matchWinPercentageOf(player),
      opponentsMatchWinPercentage: this.averageWithFloor(
        opponents.map((opponent) => this.matchWinPercentageOf(opponent)),
      ),
      gameWinPercentage: player.getGameWinPercentage(),
      opponentsGameWinPercentage: this.averageWithFloor(
        opponents.map((opponent) => opponent.getGameWinPercentage()),
      ),
    };
  }

  /**
   * Computes tiebreakers for every player at once. Convenient for building
   * standings, since every player's tiebreakers depend on the same snapshot
   * of the tournament.
   */
  static calculateForAll(
    allPlayers: readonly Player[],
  ): Map<PlayerId, Tiebreakers> {
    const result = new Map<PlayerId, Tiebreakers>();
    for (const player of allPlayers) {
      result.set(player.getId(), this.calculateFor(player, allPlayers));
    }
    return result;
  }

  /**
   * Ranks two players according to the official tiebreaker order:
   * match points -> OMW% -> GW% -> OGW%.
   * Returns a negative number if `a` should rank above `b`, positive if
   * below, and 0 if they are fully tied on every tiebreaker (a true draw
   * for standings purposes, typically broken further by seed or coin flip).
   */
  static compare(a: Tiebreakers, b: Tiebreakers): number {
    if (a.matchPoints !== b.matchPoints) return b.matchPoints - a.matchPoints;
    if (a.opponentsMatchWinPercentage !== b.opponentsMatchWinPercentage) {
      return b.opponentsMatchWinPercentage - a.opponentsMatchWinPercentage;
    }
    if (a.gameWinPercentage !== b.gameWinPercentage) {
      return b.gameWinPercentage - a.gameWinPercentage;
    }
    return b.opponentsGameWinPercentage - a.opponentsGameWinPercentage;
  }

  /**
   * Match Win Percentage: match points earned divided by the maximum points
   * obtainable across all matches played (3 per match, byes included).
   * A player who has played zero matches (should not normally happen once
   * the tournament starts) is treated as 0%, since the 33% floor only
   * applies when this value is used as someone else's opponent input.
   */
  private static matchWinPercentageOf(player: Player): number {
    const matchesPlayed =
      player.getOpponentIds().length + (player.hasHadBye() ? 1 : 0);
    if (matchesPlayed === 0) return 0;
    return player.getPoints() / (matchesPlayed * 3);
  }

  /**
   * Averages a list of percentages, applying the 33% floor to each value
   * first. Byes are already excluded upstream, since a bye never adds an
   * entry to a player's opponentIds.
   */
  private static averageWithFloor(percentages: number[]): number {
    if (percentages.length === 0) return MINIMUM_OPPONENT_PERCENTAGE;
    const floored = percentages.map((p) =>
      Math.max(p, MINIMUM_OPPONENT_PERCENTAGE),
    );
    return floored.reduce((sum, p) => sum + p, 0) / floored.length;
  }
}
