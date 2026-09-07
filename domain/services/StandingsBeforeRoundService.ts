import { Player, PlayerId } from "../entities/Player";
import { Match } from "../entities/Match";
import { RoundNumber } from "../entities/Round";
import { Tournament } from "../entities/Tournament";
import { TiebreakerCalculator } from "./TiebreakerCalculator";

/**
 * Reconstructs the standings exactly as they were at the start of a given
 * round: every player's stats (points, opponents, game record, byes) are
 * replayed from the results of the rounds played before it, so the snapshot
 * matches what SwissPairingService saw when it generated that round.
 *
 * The tournament only stores cumulative player stats, so this service rebuilds
 * pristine Player clones from the match results of rounds 1..roundNumber-1
 * instead of reading the (already advanced) live stats. It is read-only: it
 * never mutates the tournament or its players.
 */
export class StandingsBeforeRoundService {
  /**
   * Returns every player (dropped ones included, flagged as such) with their
   * stats as of the start of `roundNumber`, sorted best-to-worst using the
   * same tiebreaker order the pairing service and the standings table use.
   */
  static snapshot(tournament: Tournament, roundNumber: RoundNumber): Player[] {
    const clones = new Map<PlayerId, Player>(
      tournament
        .getPlayers()
        .map((player) => [
          player.getId(),
          Player.create(player.getId(), player.getName()),
        ]),
    );

    for (const round of tournament.getRounds()) {
      if (round.getRoundNumber() >= roundNumber) break;
      for (const match of round.getMatches()) {
        this.replayMatch(clones, match);
      }
    }

    // Dropped status is not a stat replayed from matches; carry it over so
    // the snapshot matches the standings table the organizer already knows.
    for (const player of tournament.getPlayers()) {
      if (player.isDropped()) {
        clones.get(player.getId())!.drop();
      }
    }

    const players = [...clones.values()];
    const tiebreakersById = TiebreakerCalculator.calculateForAll(players);
    return players.sort((a, b) =>
      TiebreakerCalculator.compare(
        tiebreakersById.get(a.getId())!,
        tiebreakersById.get(b.getId())!,
      ),
    );
  }

  /**
   * Applies a single match's result to the cloned players, mirroring the
   * stat updates the RegisterMatchResult use-case performs on the live
   * entities (win = 3, draw = 1, double loss = 0, bye = 3 + 2-0 games).
   */
  private static replayMatch(
    clones: Map<PlayerId, Player>,
    match: Match,
  ): void {
    const result = match.getResult();

    if (match.isBye()) {
      clones.get(match.getPlayer1Id())!.recordBye();
      return;
    }
    if (result.type === "pending") return;

    const player1 = clones.get(match.getPlayer1Id())!;
    const player2 = clones.get(match.getPlayer2Id()!)!;
    const roundNumber = match.getRoundNumber();

    switch (result.type) {
      case "win": {
        const winner = result.winnerId === player1.getId() ? player1 : player2;
        const loser = result.winnerId === player1.getId() ? player2 : player1;
        const totalGames = result.winnerGames + result.loserGames;
        winner.recordMatchWin(loser.getId(), result.winnerGames, totalGames);
        loser.recordMatchLoss(
          winner.getId(),
          roundNumber,
          result.loserGames,
          totalGames,
        );
        break;
      }

      case "draw": {
        const totalGames = result.player1Games + result.player2Games;
        player1.recordMatchDraw(
          player2.getId(),
          result.player1Games,
          totalGames,
        );
        player2.recordMatchDraw(
          player1.getId(),
          result.player2Games,
          totalGames,
        );
        break;
      }

      case "double_loss": {
        const totalGames = result.player1Games + result.player2Games;
        player1.recordMatchLoss(
          player2.getId(),
          roundNumber,
          result.player1Games,
          totalGames,
        );
        player2.recordMatchLoss(
          player1.getId(),
          roundNumber,
          result.player2Games,
          totalGames,
        );
        break;
      }
    }
  }
}
