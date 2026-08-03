import { TournamentId } from "../../domain/entities/Tournament";
import { TopCutBracket } from "../../domain/entities/TopCutBracket";
import { TopCutBracketGenerator } from "../../domain/services/TopCutBracketGenerator";
import { TournamentRepository } from "../ports/TournamentRepository";
import { TopCutBracketRepository } from "../ports/TopCutBracketRepository";
import { Logger } from "../ports/Logger";
import { loadOwnedTournament } from "./shared/loadOwnedTournament";

export interface AdvanceToTopCutCommand {
  tournamentId: TournamentId;
  requestingUserId: string;
}

/**
 * Ends the swiss stage and generates the Top Cut bracket. The tournament
 * (phase + each qualifier's assigned topCutSeed) and the bracket are two
 * separate aggregates, so both repositories need to persist their half of
 * the result.
 */
export class AdvanceToTopCut {
  constructor(
    private readonly tournamentRepository: TournamentRepository,
    private readonly topCutBracketRepository: TopCutBracketRepository,
    private readonly logger: Logger,
  ) {}

  async execute(command: AdvanceToTopCutCommand): Promise<TopCutBracket> {
    const tournament = await loadOwnedTournament(
      this.tournamentRepository,
      command.tournamentId,
      command.requestingUserId,
    );

    // Validates swiss-stage completion, top cut configuration, and enough
    // active players — then flips the phase. Done before generating the
    // bracket so we fail fast with the domain's own clear error messages.
    tournament.advanceToTopCut();

    const bracket = TopCutBracketGenerator.generate(tournament);

    await this.tournamentRepository.save(tournament);
    await this.topCutBracketRepository.save(tournament.getId(), bracket);

    this.logger.info("Advanced to top cut", {
      tournamentId: tournament.getId(),
      topCutSize: tournament.getTopCutSize(),
    });

    return bracket;
  }
}
