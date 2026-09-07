import { PlayerId } from "../../domain/entities/Player";
import { Round } from "../../domain/entities/Round";
import { TournamentId } from "../../domain/entities/Tournament";
import {
  SwissPairingService,
  ManualPairing,
} from "../../domain/services/SwissPairingService";
import { TournamentRepository } from "../ports/TournamentRepository";
import { Logger } from "../ports/Logger";
import { loadOwnedTournament } from "./shared/loadOwnedTournament";

export interface GenerateNextRoundCommand {
  tournamentId: TournamentId;
  requestingUserId: string;
  /**
   * Organizer-provided pairings, used instead of automatic generation.
   * Works for any round (including round 1) — e.g. to reproduce a real
   * event's actual pairings for an audit, or to manually seed round 1.
   */
  manualPairings?: ManualPairing[];
  /**
   * Optional initial ranking (best to worst) to seed round 1's automatic
   * pairing with, instead of a random draw. Only valid for round 1, and
   * ignored (rejected) if manualPairings is also given.
   */
  seedOrder?: PlayerId[];
}

export class GenerateNextRound {
  constructor(
    private readonly tournamentRepository: TournamentRepository,
    private readonly logger: Logger,
  ) {}

  async execute(command: GenerateNextRoundCommand): Promise<Round> {
    const tournament = await loadOwnedTournament(
      this.tournamentRepository,
      command.tournamentId,
      command.requestingUserId,
    );

    const roundNumber = tournament.getRounds().length + 1;

    if (command.seedOrder && command.manualPairings) {
      throw new Error("Provide either manualPairings or seedOrder, not both");
    }
    if (command.seedOrder && roundNumber !== 1) {
      throw new Error("seedOrder is only applicable when generating round 1");
    }

    let round: Round;
    if (command.manualPairings) {
      round = SwissPairingService.buildManualRound(
        roundNumber,
        tournament.getActivePlayers(),
        command.manualPairings,
      );
    } else if (roundNumber === 1) {
      // KTS-style initial ranking: the order used for round 1's draw becomes
      // the persistent tiebreak for fully-tied players in every later round
      // (standings, pairing and top cut all sort stably over the player
      // list). An explicit seedOrder replaces the random draw; manual
      // pairings leave the registration order untouched.
      if (command.seedOrder) {
        tournament.reorderPlayers(command.seedOrder);
      } else {
        tournament.randomizePlayerOrder();
      }
      round = SwissPairingService.generateFirstRound(
        tournament.getActivePlayers(),
        {
          seedOrder:
            command.seedOrder ??
            tournament.getActivePlayers().map((p) => p.getId()),
        },
      );
    } else {
      round = SwissPairingService.generateNextRound(tournament);
    }

    tournament.addRound(round);
    await this.tournamentRepository.save(tournament);

    this.logger.info("Round generated", {
      tournamentId: tournament.getId(),
      roundNumber,
      mode: command.manualPairings ? "manual" : "automatic",
      matchCount: round.getMatches().length,
    });

    return round;
  }
}
