import { RoundNumber } from "../../domain/entities/Round";
import { TournamentId } from "../../domain/entities/Tournament";
import { TournamentRepository } from "../ports/TournamentRepository";
import { Logger } from "../ports/Logger";
import { loadOwnedTournament } from "./shared/loadOwnedTournament";

export interface RevertRoundForEditCommand {
  tournamentId: TournamentId;
  requestingUserId: string;
  roundNumber: RoundNumber;
}

/**
 * Reverts a completed round that is not the most recently played one so the
 * organizer can correct a result: every later round is removed (its results
 * and byes are undone), the target round is reopened, and a new round can
 * then be generated with recalculated pairings.
 *
 * This is the "cascade" counterpart of RevertRoundCompletion, which only
 * works on the most recently played round. Tournament.revertRoundsForEdit
 * guards the operation to the swiss phase, since top cut brackets are built
 * from the final standings and cannot be unwound this way.
 */
export class RevertRoundForEdit {
  constructor(
    private readonly tournamentRepository: TournamentRepository,
    private readonly logger: Logger,
  ) {}

  async execute(command: RevertRoundForEditCommand): Promise<void> {
    const tournament = await loadOwnedTournament(
      this.tournamentRepository,
      command.tournamentId,
      command.requestingUserId,
    );

    tournament.revertRoundsForEdit(command.roundNumber);

    await this.tournamentRepository.save(tournament);

    this.logger.info("Round reverted for editing", {
      tournamentId: tournament.getId(),
      roundNumber: command.roundNumber,
    });
  }
}
