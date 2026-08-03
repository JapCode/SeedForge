import { PlayerId } from "../../domain/entities/Player";
import { MatchId } from "../../domain/entities/Match";
import { RoundNumber } from "../../domain/entities/Round";
import { TournamentId } from "../../domain/entities/Tournament";
import { TournamentRepository } from "../ports/TournamentRepository";
import { Logger } from "../ports/Logger";
import { loadOwnedTournament } from "./shared/loadOwnedTournament";

export type MatchResultInput =
  | { type: "win"; winnerId: PlayerId; winnerGames: number; loserGames: number }
  | { type: "draw"; player1Games: number; player2Games: number }
  | { type: "double_loss"; player1Games: number; player2Games: number };

export interface RegisterMatchResultCommand {
  tournamentId: TournamentId;
  requestingUserId: string;
  roundNumber: RoundNumber;
  matchId: MatchId;
  result: MatchResultInput;
}

/**
 * Reports the outcome of a single match and keeps both players' stats
 * (points, opponent history, game record) in sync with it. This is the only
 * place in the application layer that's allowed to call Match.reportWin /
 * reportDraw / reportDoubleLoss together with the matching Player mutations —
 * keeping that pairing together here is what makes RevertMatchResult safe to
 * write as its exact inverse.
 */
export class RegisterMatchResult {
  constructor(
    private readonly tournamentRepository: TournamentRepository,
    private readonly logger: Logger,
  ) {}

  async execute(command: RegisterMatchResultCommand): Promise<void> {
    const tournament = await loadOwnedTournament(
      this.tournamentRepository,
      command.tournamentId,
      command.requestingUserId,
    );

    const round = tournament.getRound(command.roundNumber);
    const match = round.getMatch(command.matchId);

    if (match.isBye()) {
      throw new Error(
        `Match ${command.matchId} is a bye and cannot have a result registered`,
      );
    }

    const player1 = tournament.getPlayer(match.getPlayer1Id());
    const player2 = tournament.getPlayer(match.getPlayer2Id()!);

    switch (command.result.type) {
      case "win": {
        const { winnerId, winnerGames, loserGames } = command.result;
        match.reportWin(winnerId, winnerGames, loserGames);

        const winner = winnerId === player1.getId() ? player1 : player2;
        const loser = winnerId === player1.getId() ? player2 : player1;
        const totalGames = winnerGames + loserGames;

        winner.recordMatchWin(loser.getId(), winnerGames, totalGames);
        loser.recordMatchLoss(winner.getId(), loserGames, totalGames);
        break;
      }

      case "draw": {
        if (!tournament.getRuleset().allowsDraws()) {
          throw new Error(
            "Draws are not allowed under this tournament's current ruleset",
          );
        }
        const { player1Games, player2Games } = command.result;
        match.reportDraw(player1Games, player2Games);

        const totalGames = player1Games + player2Games;
        player1.recordMatchDraw(player2.getId(), player1Games, totalGames);
        player2.recordMatchDraw(player1.getId(), player2Games, totalGames);
        break;
      }

      case "double_loss": {
        const { player1Games, player2Games } = command.result;
        match.reportDoubleLoss(player1Games, player2Games);

        const totalGames = player1Games + player2Games;
        // A double loss is, for each player individually, just a loss: no
        // points, but the opponent and games still count toward tiebreakers.
        player1.recordMatchLoss(player2.getId(), player1Games, totalGames);
        player2.recordMatchLoss(player1.getId(), player2Games, totalGames);
        break;
      }
    }

    await this.tournamentRepository.save(tournament);

    this.logger.info("Match result registered", {
      tournamentId: tournament.getId(),
      roundNumber: command.roundNumber,
      matchId: command.matchId,
      resultType: command.result.type,
    });
  }
}
