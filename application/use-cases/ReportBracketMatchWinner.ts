import { PlayerId } from "../../domain/entities/Player";
import { RoundIndex } from "../../domain/entities/BracketMatch";
import { TournamentId } from "../../domain/entities/Tournament";
import { TournamentRepository } from "../ports/TournamentRepository";
import { TopCutBracketRepository } from "../ports/TopCutBracketRepository";
import { Logger } from "../ports/Logger";
import { loadOwnedTournament } from "./shared/loadOwnedTournament";

export interface ReportBracketMatchWinnerCommand {
  tournamentId: TournamentId;
  requestingUserId: string;
  roundIndex: RoundIndex;
  position: number;
  winnerId: PlayerId;
}

/**
 * Reports the winner of a Top Cut bracket match. TopCutBracket.reportMatchWinner
 * already advances the winner into the correct slot of the next round. If this
 * was the final (the bracket becomes complete), the tournament itself is
 * automatically marked completed too.
 */
export class ReportBracketMatchWinner {
  constructor(
    private readonly tournamentRepository: TournamentRepository,
    private readonly topCutBracketRepository: TopCutBracketRepository,
    private readonly logger: Logger,
  ) {}

  async execute(command: ReportBracketMatchWinnerCommand): Promise<void> {
    const tournament = await loadOwnedTournament(
      this.tournamentRepository,
      command.tournamentId,
      command.requestingUserId,
    );

    if (tournament.getPhase() !== "top_cut") {
      throw new Error(
        `Tournament ${tournament.getId()} is not in the top cut phase`,
      );
    }

    const bracket = await this.topCutBracketRepository.findByTournamentId(
      tournament.getId(),
    );
    if (!bracket) {
      throw new Error(
        `No top cut bracket found for tournament ${tournament.getId()}`,
      );
    }

    bracket.reportMatchWinner(
      command.roundIndex,
      command.position,
      command.winnerId,
    );
    await this.topCutBracketRepository.save(tournament.getId(), bracket);

    if (bracket.isComplete()) {
      tournament.complete();
      await this.tournamentRepository.save(tournament);
    }

    this.logger.info("Bracket match winner reported", {
      tournamentId: tournament.getId(),
      roundIndex: command.roundIndex,
      position: command.position,
      winnerId: command.winnerId,
      tournamentCompleted: bracket.isComplete(),
    });
  }
}
