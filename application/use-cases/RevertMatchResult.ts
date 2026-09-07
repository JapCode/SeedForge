import { MatchId } from "../../domain/entities/Match";
import { RoundNumber } from "../../domain/entities/Round";
import { TournamentId } from "../../domain/entities/Tournament";
import { TournamentRepository } from "../ports/TournamentRepository";
import { Logger } from "../ports/Logger";
import { loadOwnedTournament } from "./shared/loadOwnedTournament";

export interface RevertMatchResultCommand {
  tournamentId: TournamentId;
  requestingUserId: string;
  roundNumber: RoundNumber;
  matchId: MatchId;
}

/**
 * Reverts a previously reported match result, undoing the exact effect
 * RegisterMatchResult applied: the Match goes back to pending, and both
 * players lose the points/opponent/game record that result had granted them.
 *
 * If the round containing this match was already marked completed, that
 * completion is also reverted first — a completed round can no longer be
 * true once one of its matches is back to pending. Tournament.revertRoundCompletion
 * enforces that only the most recently played round can be reverted, which is
 * exactly the safety net we want here too: you can't quietly invalidate a
 * result from three rounds ago while a later round already depends on it.
 */
export class RevertMatchResult {
  constructor(
    private readonly tournamentRepository: TournamentRepository,
    private readonly logger: Logger,
  ) {}

  async execute(command: RevertMatchResultCommand): Promise<void> {
    const tournament = await loadOwnedTournament(
      this.tournamentRepository,
      command.tournamentId,
      command.requestingUserId,
    );

    const round = tournament.getRound(command.roundNumber);
    const match = round.getMatch(command.matchId);
    const previousResult = match.getResult();

    if (previousResult.type === "bye") {
      throw new Error(
        `Match ${command.matchId} is a bye and cannot be reverted`,
      );
    }
    if (previousResult.type === "pending") {
      throw new Error(
        `Match ${command.matchId} has no reported result to revert`,
      );
    }

    if (round.isCompleted()) {
      // Throws if this isn't the most recently played round, protecting
      // against invalidating a result a later round's pairings already rely on.
      tournament.revertRoundCompletion(round.getRoundNumber());
    }

    match.revertResult();

    const player1 = tournament.getPlayer(match.getPlayer1Id());
    const player2 = tournament.getPlayer(match.getPlayer2Id()!);

    switch (previousResult.type) {
      case "win": {
        const winner =
          previousResult.winnerId === player1.getId() ? player1 : player2;
        const loser =
          previousResult.winnerId === player1.getId() ? player2 : player1;
        const totalGames =
          previousResult.winnerGames + previousResult.loserGames;

        winner.revertMatchResult(
          loser.getId(),
          command.roundNumber,
          3,
          previousResult.winnerGames,
          totalGames,
        );
        loser.revertMatchResult(
          winner.getId(),
          command.roundNumber,
          0,
          previousResult.loserGames,
          totalGames,
        );
        break;
      }

      case "draw": {
        const totalGames =
          previousResult.player1Games + previousResult.player2Games;
        player1.revertMatchResult(
          player2.getId(),
          command.roundNumber,
          1,
          previousResult.player1Games,
          totalGames,
        );
        player2.revertMatchResult(
          player1.getId(),
          command.roundNumber,
          1,
          previousResult.player2Games,
          totalGames,
        );
        break;
      }

      case "double_loss": {
        const totalGames =
          previousResult.player1Games + previousResult.player2Games;
        player1.revertMatchResult(
          player2.getId(),
          command.roundNumber,
          0,
          previousResult.player1Games,
          totalGames,
        );
        player2.revertMatchResult(
          player1.getId(),
          command.roundNumber,
          0,
          previousResult.player2Games,
          totalGames,
        );
        break;
      }
    }

    await this.tournamentRepository.save(tournament);

    this.logger.info("Match result reverted", {
      tournamentId: tournament.getId(),
      roundNumber: command.roundNumber,
      matchId: command.matchId,
      revertedResultType: previousResult.type,
    });
  }
}
