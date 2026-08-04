import { RoundIndex } from "../../domain/entities/BracketMatch";
import { TournamentId } from "../../domain/entities/Tournament";
import { TournamentRepository } from "../ports/TournamentRepository";
import { TopCutBracketRepository } from "../ports/TopCutBracketRepository";
import { Logger } from "../ports/Logger";
import { loadOwnedTournament } from "./shared/loadOwnedTournament";

export interface RevertBracketMatchWinnerCommand {
  tournamentId: TournamentId;
  requestingUserId: string;
  roundIndex: RoundIndex;
  position: number;
}

/**
 * Reverts a previously reported Top Cut bracket match winner.
 * TopCutBracket.revertMatchWinner already refuses to revert a match whose
 * winner has advanced into an already-decided next match (downstream
 * results must be reverted first). If the tournament had already been
 * marked completed because this was the final, it's reopened back to top_cut.
 */
export class RevertBracketMatchWinner {
  constructor(
    private readonly tournamentRepository: TournamentRepository,
    private readonly topCutBracketRepository: TopCutBracketRepository,
    private readonly logger: Logger,
  ) {}

  async execute(command: RevertBracketMatchWinnerCommand): Promise<void> {
    const tournament = await loadOwnedTournament(
      this.tournamentRepository,
      command.tournamentId,
      command.requestingUserId,
    );

    const bracket = await this.topCutBracketRepository.findByTournamentId(
      tournament.getId(),
    );
    if (!bracket) {
      throw new Error(
        `No top cut bracket found for tournament ${tournament.getId()}`,
      );
    }

    const wasComplete = bracket.isComplete();

    bracket.revertMatchWinner(command.roundIndex, command.position);
    await this.topCutBracketRepository.save(tournament.getId(), bracket);

    if (wasComplete && tournament.getPhase() === "completed") {
      tournament.revertCompletion();
      await this.tournamentRepository.save(tournament);
    }

    this.logger.info("Bracket match winner reverted", {
      tournamentId: tournament.getId(),
      roundIndex: command.roundIndex,
      position: command.position,
    });
  }
}
